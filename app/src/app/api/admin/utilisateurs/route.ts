import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const ROLES_VALIDES = [
  "super_admin",
  "chef_admin",
  "secretaire_general",
  "inspecteur",
  "responsable_bureau",
  "agent_bureau",
];

function genererMotDePasseTemporaire(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const octets = new Uint8Array(12);
  crypto.getRandomValues(octets);
  return Array.from(octets, (o) => alphabet[o % alphabet.length]).join("");
}

async function idAppelant(req: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  const callerId = await idAppelant(req);
  if (!callerId) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d'environnement du serveur." },
      { status: 500 }
    );
  }
  const admin = createClient(url, serviceKey);

  // Vérifie que l'appelant est bien Super Admin actif (jamais fait confiance au client)
  const { data: profilAppelant, error: erreurProfil } = await admin
    .from("utilisateurs")
    .select("role, actif")
    .eq("id", callerId)
    .single();

  if (erreurProfil || !profilAppelant || profilAppelant.role !== "super_admin" || !profilAppelant.actif) {
    return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.action) {
    return NextResponse.json({ error: "Action manquante." }, { status: 400 });
  }

  try {
    switch (body.action) {
      // ==================================================================
      case "creer": {
        const { email, nom_complet, role, bureau_id, fonction } = body as {
          email: string; nom_complet: string; role: string; bureau_id: number | null; fonction: string | null;
        };
        if (!email?.trim() || !nom_complet?.trim() || !role) {
          return NextResponse.json({ error: "Champs requis manquants (email, nom complet, rôle)." }, { status: 400 });
        }
        if (!ROLES_VALIDES.includes(role)) {
          return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
        }

        const motDePasseTemporaire = genererMotDePasseTemporaire();
        const { data: nouvelUtilisateur, error: erreurCreation } = await admin.auth.admin.createUser({
          email: email.trim(),
          password: motDePasseTemporaire,
          email_confirm: true,
          user_metadata: { nom_complet: nom_complet.trim(), fonction: fonction?.trim() || null },
        });

        if (erreurCreation || !nouvelUtilisateur?.user) {
          return NextResponse.json(
            { error: erreurCreation?.message || "Échec de la création du compte." },
            { status: 400 }
          );
        }

        const { error: erreurProfilInsert } = await admin.from("utilisateurs").insert({
          id: nouvelUtilisateur.user.id,
          nom_complet: nom_complet.trim(),
          email: email.trim(),
          role,
          bureau_id: bureau_id ?? null,
          fonction: fonction?.trim() || null,
          actif: true,
          doit_changer_mot_de_passe: true,
        });

        if (erreurProfilInsert) {
          await admin.auth.admin.deleteUser(nouvelUtilisateur.user.id);
          return NextResponse.json(
            { error: "Échec de la création du profil : " + erreurProfilInsert.message },
            { status: 400 }
          );
        }

        return NextResponse.json({
          id: nouvelUtilisateur.user.id,
          mot_de_passe_temporaire: motDePasseTemporaire,
        });
      }

      // ==================================================================
      case "reinitialiser_mot_de_passe": {
        const { id } = body as { id: string };
        if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

        const nouveauMotDePasse = genererMotDePasseTemporaire();
        const { error: erreurMdp } = await admin.auth.admin.updateUserById(id, { password: nouveauMotDePasse });
        if (erreurMdp) return NextResponse.json({ error: erreurMdp.message }, { status: 400 });

        await admin.from("utilisateurs").update({ doit_changer_mot_de_passe: true }).eq("id", id);
        return NextResponse.json({ mot_de_passe_temporaire: nouveauMotDePasse });
      }

      // ==================================================================
      case "supprimer": {
        const { id } = body as { id: string };
        if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
        if (id === callerId) {
          return NextResponse.json({ error: "Impossible de supprimer votre propre compte." }, { status: 400 });
        }

        // La ligne public.utilisateurs est supprimée automatiquement (ON DELETE CASCADE)
        const { error: erreurSuppression } = await admin.auth.admin.deleteUser(id);
        if (erreurSuppression) return NextResponse.json({ error: erreurSuppression.message }, { status: 400 });

        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne." },
      { status: 500 }
    );
  }
}
