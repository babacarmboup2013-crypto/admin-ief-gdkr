"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BureauxTab } from "./bureaux-tab";
import { UtilisateursTab } from "./utilisateurs-tab";
import { EcolesTab } from "./ecoles-tab";
import { PersonnelTab } from "./personnel-tab";
import { DossiersTab } from "./dossiers-tab";
import { RapportsTab } from "./rapports-tab";
import { ReunionsTab } from "./reunions-tab";
import { DepartTab } from "./depart-tab";

export function AdminPage() {
  return (
    <Tabs defaultValue="bureaux">
      <TabsList
        variant="line"
        className="mb-5 h-auto w-full flex-wrap gap-1"
      >
        <TabsTrigger value="bureaux">Bureaux</TabsTrigger>
        <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
        <TabsTrigger value="ecoles">Écoles</TabsTrigger>
        <TabsTrigger value="personnel">Personnel</TabsTrigger>
        <TabsTrigger value="dossiers">Dossiers</TabsTrigger>
        <TabsTrigger value="rapports">Rapports</TabsTrigger>
        <TabsTrigger value="reunions">Réunions</TabsTrigger>
        <TabsTrigger value="depart">Départ</TabsTrigger>
      </TabsList>

      <TabsContent value="bureaux">
        <BureauxTab />
      </TabsContent>
      <TabsContent value="utilisateurs">
        <UtilisateursTab />
      </TabsContent>
      <TabsContent value="ecoles">
        <EcolesTab />
      </TabsContent>
      <TabsContent value="personnel">
        <PersonnelTab />
      </TabsContent>
      <TabsContent value="dossiers">
        <DossiersTab />
      </TabsContent>
      <TabsContent value="rapports">
        <RapportsTab />
      </TabsContent>
      <TabsContent value="reunions">
        <ReunionsTab />
      </TabsContent>
      <TabsContent value="depart">
        <DepartTab />
      </TabsContent>
    </Tabs>
  );
}