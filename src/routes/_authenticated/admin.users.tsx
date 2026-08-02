import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAdminAction, type AdminUserRow } from "@/lib/admin";
import { DEALER_TIER_LABEL, normalizeTier, type DealerTier } from "@/lib/dealer";
import { AdminToolbar, Pager, usePaging } from "@/components/admin/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "User & Dealer Management · Admin" },
      { name: "description", content: "Manage marketplace members, dealer tiers and administrator roles." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "User & Dealer Management · Admin" },
      { property: "og:description", content: "Manage members, dealer tiers and roles." },
    ],
  }),
  component: AdminUsers;
});

function AdminUsers() {
  return null;
}
