import type { Profile } from "@/lib/role-context";
import type { RoleId } from "@/lib/types";

export interface CrudPerms {
  add: boolean;
  edit: boolean;
  del: boolean;
}

export interface AdminPerms {
  bureaux: CrudPerms;
  utilisateurs: CrudPerms;
  ecoles: CrudPerms;
  personnel: CrudPerms;
  dossiers: CrudPerms;
  rapports: CrudPerms;
  reunions: CrudPerms;
}

const VIEW = { add: false, edit: false, del: false };
const ALL = { add: true, edit: true, del: true };
const EDIT = { add: false, edit: true, del: true };

export function adminPerms(role: RoleId, profile: Profile): AdminPerms {
  const bureau7 = profile.bureauId === 7;

  if (role === "super") {
    return {
      bureaux: ALL,
      utilisateurs: ALL,
      ecoles: ALL,
      personnel: ALL,
      dossiers: ALL,
      rapports: ALL,
      reunions: ALL,
    };
  }

  if (role === "chef") {
    return {
      bureaux: VIEW,
      utilisateurs: VIEW,
      ecoles: VIEW,
      personnel: ALL,
      dossiers: ALL,
      rapports: ALL,
      reunions: { add: true, edit: true, del: false },
    };
  }

  if (role === "secretaire") {
    return {
      bureaux: VIEW,
      utilisateurs: VIEW,
      ecoles: VIEW,
      personnel: VIEW,
      dossiers: ALL,
      rapports: ALL,
      reunions: { add: true, edit: true, del: false },
    };
  }

  if (role === "inspecteur") {
    return {
      bureaux: VIEW,
      utilisateurs: VIEW,
      ecoles: VIEW,
      personnel: VIEW,
      dossiers: EDIT,
      rapports: EDIT,
      reunions: { add: true, edit: true, del: false },
    };
  }

  if (role === "responsable") {
    return {
      bureaux: VIEW,
      utilisateurs: VIEW,
      ecoles: bureau7 ? ALL : VIEW,
      personnel: ALL,
      dossiers: ALL,
      rapports: ALL,
      reunions: { add: true, edit: true, del: false },
    };
  }

  if (role === "rh") {
    return {
      bureaux: VIEW,
      utilisateurs: VIEW,
      ecoles: bureau7 ? ALL : VIEW,
      personnel: bureau7 ? ALL : VIEW,
      dossiers: ALL,
      rapports: ALL,
      reunions: { add: true, edit: true, del: false },
    };
  }

  // agent
  return {
    bureaux: VIEW,
    utilisateurs: VIEW,
    ecoles: VIEW,
    personnel: VIEW,
    dossiers: ALL,
    rapports: ALL,
    reunions: { add: true, edit: true, del: false },
  };
}

/** Seuls l'IEF (rôle chef) et le Super Admin ont une vue sur tous les bureaux. */
export function voitTousLesBureaux(role: RoleId): boolean {
  return role === "super" || role === "chef";
}