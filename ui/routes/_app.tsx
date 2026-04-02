import { ListFilterIcon, PanelsTopLeftIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, href, useLoaderData, useLocation } from "react-router";
import { Entrypoint } from "~/core/entrypoint";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "~/ui/components/ui/sidebar";
import { box } from "~/ui/lib/utils.server";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../components/ui/input-group";

export async function loader() {
  const entrypoint = box.get(Entrypoint);
  const { db } = await entrypoint.get();
  const collections = db.listCollections().sort((left, right) => left.localeCompare(right));
  return { collections };
}

export default function StudioLayout() {
  return (
    <SidebarProvider className="h-screen">
      <StudioSidebar />
      <SidebarInset className="min-h-0 overflow-hidden">
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

function StudioSidebar() {
  const { collections } = useLoaderData<typeof loader>();
  const [search, setSearch] = useState("");
  const location = useLocation();
  const { open } = useSidebar();

  const filteredCollections = collections.filter((c) => c.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader>
        <InputGroup data-hide={open ? undefined : true}>
          <InputGroupInput
            className="group-data-hide/input-group:hidden"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
          />
          <InputGroupAddon className="pl-1.5">
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end" className="pr-1.5 group-data-hide/input-group:hidden">
            <ListFilterIcon />
          </InputGroupAddon>
        </InputGroup>
      </SidebarHeader>

      {/* Collections list */}
      <SidebarContent>
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-foreground/30">Collections</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredCollections.map((collection) => {
                const to = href("/collections/:name", { name: collection });
                const isActive = location.pathname === to;
                return (
                  <SidebarMenuItem key={collection}>
                    <SidebarMenuButton render={<NavLink to={to} />} isActive={isActive} size="sm" tooltip={collection}>
                      <PanelsTopLeftIcon />
                      <span>{collection}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {!filteredCollections.length && (
                <p className="text-foreground/25 px-2.5 py-3 text-xs group-data-[collapsible=icon]:hidden">
                  {search ? "No matches." : "No collections configured."}
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
