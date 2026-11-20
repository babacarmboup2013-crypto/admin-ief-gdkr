"use client";

import { EcolesTab } from "@/components/admin/ecoles-tab";
import { PersonnelTab } from "@/components/admin/personnel-tab";
import { PersonnelBureauTab } from "@/components/admin/personnel-bureau-tab";
import { DepartTab } from "@/components/admin/depart-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/lib/role-context";
import { peutVoirPersonnel } from "@/lib/admin-perms";

export default function PersonnelPage() {
  const { role, profile } = useRole();

  if (!peutVoirPersonnel(role, profile)) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="font-serif text-[20px] text-navy">Accès refusé</h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">
          Cette rubrique est réservée au bureau Ressources Humaines, à l&apos;IEF et au Super Admin.
        </p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="bureau">
      <TabsList variant="line" className="mb-5 h-auto w-full flex-wrap gap-1">
        <TabsTrigger value="bureau">Personnel IEF</TabsTrigger>
        <TabsTrigger value="ecoles">Écoles</TabsTrigger>
        <TabsTrigger value="personnel">Personnel</TabsTrigger>
        <TabsTrigger value="depart">Départ / mutés</TabsTrigger>
      </TabsList>
      <TabsContent value="ecoles"><EcolesTab /></TabsContent>
      <TabsContent value="bureau"><PersonnelBureauTab /></TabsContent>
      <TabsContent value="personnel"><PersonnelTab /></TabsContent>
      <TabsContent value="depart"><DepartTab /></TabsContent>
    </Tabs>
  );
}
