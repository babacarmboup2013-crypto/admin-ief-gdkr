"use client";

import { EcolesTab } from "@/components/admin/ecoles-tab";
import { PersonnelTab } from "@/components/admin/personnel-tab";
import { PersonnelBureauTab } from "@/components/admin/personnel-bureau-tab";
import { DepartTab } from "@/components/admin/depart-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PersonnelPage() {
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
