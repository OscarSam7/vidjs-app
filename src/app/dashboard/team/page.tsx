"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  ShieldCheck,
  Headphones,
  Tv,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Key,
  Trash2,
  Edit3,
  Plus,
  Search,
  RefreshCw,
  Lock,
  Save,
  Check,
  X,
  RotateCcw,
  Sliders,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  Layers,
} from "lucide-react";
import {
  Permission,
  PermissionDefinition,
  PermissionCategoryKey,
  Role,
  RoleDefinition,
} from "@/lib/rbac/permissions";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt?: string;
}

export default function TeamRolesPermissionsPage() {
  const [activeTab, setActiveTab] = useState<"members" | "matrix">("members");
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [categories, setCategories] = useState<Record<string, any>>({});
  const [rolePermissions, setRolePermissions] = useState<Record<string, Permission[]>>({
    MANAGER: [],
    DJ: [],
    OPERATOR: [],
  });
  const [initialRolePermissions, setInitialRolePermissions] = useState<Record<string, Permission[]>>({
    MANAGER: [],
    DJ: [],
    OPERATOR: [],
  });
  const [currentUser, setCurrentUser] = useState<{ id: string; role: Role; email: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modales
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);

  // Formularios
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    password: "",
    role: "DJ" as Role,
    phone: "",
  });
  const [editUserData, setEditUserData] = useState({
    name: "",
    role: "DJ" as Role,
    phone: "",
    status: "ACTIVE" as "ACTIVE" | "SUSPENDED",
  });
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [submittingUser, setSubmittingUser] = useState(false);

  // Cargar datos desde la API
  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/team");
      if (!res.ok) {
        throw new Error("No se pudo cargar la información del equipo.");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setUsers(json.data.users || []);
        setRoles(json.data.roles || []);
        setPermissions(json.data.permissions || []);
        setCategories(json.data.categories || {});
        setRolePermissions(json.data.rolePermissions || {});
        setInitialRolePermissions(json.data.rolePermissions || {});
        setCurrentUser(json.data.currentUser || null);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error al conectar con el servidor." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  // Notificación con temporizador
  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((current) => (current?.text === text ? null : current));
    }, 5000);
  };

  // Comprobar si hay cambios pendientes en la matriz de permisos
  const isMatrixDirty = useMemo(() => {
    const mgrCurr = rolePermissions.MANAGER || [];
    const mgrInit = initialRolePermissions.MANAGER || [];
    const djCurr = rolePermissions.DJ || [];
    const djInit = initialRolePermissions.DJ || [];

    if (mgrCurr.length !== mgrInit.length || djCurr.length !== djInit.length) return true;

    const mgrChanged = mgrCurr.some((p) => !mgrInit.includes(p));
    const djChanged = djCurr.some((p) => !djInit.includes(p));

    return mgrChanged || djChanged;
  }, [rolePermissions, initialRolePermissions]);

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone && u.phone.includes(searchQuery));
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Manejo de creación de miembro
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingUser(true);
      const res = await fetch("/api/v1/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserData),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al crear miembro.");
      }
      showFeedback("success", `Miembro ${json.data.name} registrado con éxito con rol ${json.data.role}.`);
      setIsAddUserOpen(false);
      setNewUserData({ name: "", email: "", password: "", role: "DJ", phone: "" });
      fetchTeamData();
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setSubmittingUser(false);
    }
  };

  // Manejo de edición de rol o datos
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmittingUser(true);
      const res = await fetch("/api/v1/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: editUserData.role,
          name: editUserData.name,
          phone: editUserData.phone,
          status: editUserData.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al actualizar miembro.");
      }
      showFeedback("success", `Miembro ${json.data.name} actualizado correctamente.`);
      setIsEditUserOpen(false);
      setSelectedUser(null);
      fetchTeamData();
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setSubmittingUser(false);
    }
  };

  // Cambio rápido de rol desde selector inline
  const handleQuickRoleChange = async (user: TeamUser, newRole: Role) => {
    if (user.role === newRole) return;
    try {
      const res = await fetch("/api/v1/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "No se pudo cambiar el rol.");
      }
      showFeedback("success", `Rol de ${user.name} cambiado a ${newRole}.`);
      fetchTeamData();
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Cambio rápido de estado Activo/Suspendido
  const handleToggleStatus = async (user: TeamUser) => {
    const newStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch("/api/v1/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al cambiar estado.");
      }
      showFeedback(
        "success",
        `Estado de ${user.name} cambiado a ${newStatus === "ACTIVE" ? "ACTIVO" : "SUSPENDIDO"}.`
      );
      fetchTeamData();
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Restablecer contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPasswordInput) return;
    try {
      setSubmittingUser(true);
      const res = await fetch("/api/v1/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          password: newPasswordInput,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al restablecer la contraseña.");
      }
      showFeedback("success", `Nueva contraseña asignada a ${selectedUser.name}.`);
      setIsResetPasswordOpen(false);
      setSelectedUser(null);
      setNewPasswordInput("");
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setSubmittingUser(false);
    }
  };

  // Eliminar miembro
  const handleDeleteUser = async (user: TeamUser) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${user.name} (${user.email})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/team?id=${user.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al eliminar miembro.");
      }
      showFeedback("success", json.message || "Miembro eliminado.");
      fetchTeamData();
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Toggle de permiso para un rol en la matriz
  const handleTogglePermission = (targetRole: "MANAGER" | "DJ", permissionId: Permission) => {
    setRolePermissions((prev) => {
      const currentList = prev[targetRole] || [];
      const hasIt = currentList.includes(permissionId);
      const updatedList = hasIt
        ? currentList.filter((p) => p !== permissionId)
        : [...currentList, permissionId];

      return {
        ...prev,
        [targetRole]: updatedList,
      };
    });
  };

  // Guardar matriz de permisos
  const handleSaveMatrix = async () => {
    try {
      setSavingMatrix(true);
      const res = await fetch("/api/v1/team/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolePermissions }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al guardar permisos.");
      }
      setInitialRolePermissions(rolePermissions);
      showFeedback("success", "¡Matriz de permisos para Manager y DJ guardada exitosamente!");
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setSavingMatrix(false);
    }
  };

  // Restablecer permisos a los valores de fábrica
  const handleResetMatrix = async () => {
    if (!confirm("¿Deseas restablecer todos los permisos de Manager y DJ a los valores recomendados de fábrica?")) {
      return;
    }
    try {
      setSavingMatrix(true);
      const res = await fetch("/api/v1/team/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al restablecer permisos.");
      }
      setRolePermissions(json.data.rolePermissions);
      setInitialRolePermissions(json.data.rolePermissions);
      showFeedback("success", "Permisos restablecidos a los valores recomendados.");
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setSavingMatrix(false);
    }
  };

  // Generador de contraseña aleatoria
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Renderizar badge con color de rol
  const renderRoleBadge = (role: Role) => {
    switch (role) {
      case "OWNER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/50">
            👑 OWNER
          </span>
        );
      case "MANAGER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/50">
            👔 MANAGER
          </span>
        );
      case "DJ":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
            🎧 DJ CABINA
          </span>
        );
      case "OPERATOR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
            🛡️ STAFF
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed top-6 right-6 z-50 animate-fadeIn">
          <div
            className={`px-4 py-3 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 shadow-2xl backdrop-blur-md ${
              feedback.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "bg-rose-950/90 text-rose-200 border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 shadow-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Equipo, Roles y Permisos
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Asigna roles a tu personal de discoteca y personaliza los permisos operativos de Manager y DJ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-950/60 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Miembro</span>
          </button>

          {activeTab === "matrix" && (
            <>
              <button
                onClick={handleResetMatrix}
                disabled={savingMatrix}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                title="Restablecer a la configuración recomendada"
              >
                <RotateCcw className="w-4 h-4 text-zinc-400" />
                <span className="hidden sm:inline">Restablecer</span>
              </button>

              <button
                onClick={handleSaveMatrix}
                disabled={savingMatrix || !isMatrixDirty}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-lg ${
                  isMatrixDirty
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50 animate-pulse"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{savingMatrix ? "Guardando..." : "Guardar Permisos"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Total Personal</span>
          <span className="text-2xl font-black text-white mt-1 block">{users.length}</span>
          <span className="text-[10px] text-zinc-500">Miembros registrados</span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30">
          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">Managers</span>
          <span className="text-2xl font-black text-purple-200 mt-1 block">
            {users.filter((u) => u.role === "MANAGER").length}
          </span>
          <span className="text-[10px] text-purple-400">
            {rolePermissions.MANAGER?.length || 0} permisos activos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
          <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider block">DJs de Cabina</span>
          <span className="text-2xl font-black text-cyan-200 mt-1 block">
            {users.filter((u) => u.role === "DJ").length}
          </span>
          <span className="text-[10px] text-cyan-400">
            {rolePermissions.DJ?.length || 0} permisos activos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">Staff / Operadores</span>
          <span className="text-2xl font-black text-emerald-200 mt-1 block">
            {users.filter((u) => u.role === "OPERATOR").length}
          </span>
          <span className="text-[10px] text-emerald-400">Atención y mesas</span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-black border-b-2 transition-all cursor-pointer ${
            activeTab === "members"
              ? "border-purple-500 text-purple-400 bg-purple-500/10"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Miembros del Equipo & Asignar Roles</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-300">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-black border-b-2 transition-all cursor-pointer relative ${
            activeTab === "matrix"
              ? "border-purple-500 text-purple-400 bg-purple-500/10"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Matriz de Permisos (Manager vs DJ)</span>
          {isMatrixDirty && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-2 right-2" />
          )}
          <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-[10px] font-mono text-cyan-300">
            Configurable
          </span>
        </button>
      </div>

      {/* TAB 1: MIEMBROS & ASIGNAR ROLES */}
      {activeTab === "members" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filtros y Buscador */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "OWNER", "MANAGER", "DJ", "OPERATOR"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    roleFilter === r
                      ? "bg-purple-600 text-white"
                      : "bg-zinc-800/80 text-zinc-400 hover:text-white"
                  }`}
                >
                  {r === "ALL" ? "Todos" : r}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla / Lista de Miembros */}
          <div className="rounded-3xl bg-zinc-950/80 border border-zinc-800/80 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
                <p className="text-xs text-zinc-400">Cargando personal del establecimiento...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Users className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-sm font-bold text-zinc-300">No se encontraron miembros con ese filtro</p>
                <p className="text-xs text-zinc-500">Prueba ajustando el texto de búsqueda o el rol seleccionado.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80">
                {filteredUsers.map((user) => {
                  const isSelf = currentUser?.id === user.id;
                  const isOwner = user.role === "OWNER";

                  return (
                    <div
                      key={user.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-900/40 transition-colors"
                    >
                      {/* Avatar e Info */}
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm uppercase shadow-inner shrink-0 ${
                            user.role === "OWNER"
                              ? "bg-gradient-to-tr from-amber-600 to-yellow-500 text-black border border-amber-400"
                              : user.role === "MANAGER"
                              ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white border border-purple-400"
                              : user.role === "DJ"
                              ? "bg-gradient-to-tr from-cyan-600 to-blue-600 text-white border border-cyan-400"
                              : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                          }`}
                        >
                          {user.name.slice(0, 2)}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-white text-sm sm:text-base">{user.name}</h3>
                            {isSelf && (
                              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                                Tú
                              </span>
                            )}
                            {renderRoleBadge(user.role)}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                user.status === "ACTIVE"
                                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                                  : "bg-rose-950/80 text-rose-300 border border-rose-800"
                              }`}
                            >
                              {user.status === "ACTIVE" ? "ACTIVO" : "SUSPENDIDO"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Mail className="w-3.5 h-3.5 text-zinc-500" />
                              {user.email}
                            </span>
                            {user.phone && (
                              <span className="flex items-center gap-1 font-mono text-zinc-400">
                                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                                {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Selector de Rol y Acciones */}
                      <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
                        {/* Selector rápido de rol (si no es Owner ni a sí mismo) */}
                        {!isOwner && !isSelf && (
                          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                            {(["MANAGER", "DJ", "OPERATOR"] as Role[]).map((r) => (
                              <button
                                key={r}
                                onClick={() => handleQuickRoleChange(user, r)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  user.role === r
                                    ? r === "MANAGER"
                                      ? "bg-purple-600 text-white shadow-sm"
                                      : r === "DJ"
                                      ? "bg-cyan-600 text-white shadow-sm"
                                      : "bg-emerald-600 text-white shadow-sm"
                                    : "text-zinc-400 hover:text-white"
                                }`}
                                title={`Asignar rol ${r}`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Botón de estado activo/suspendido */}
                        {!isOwner && !isSelf && (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                              user.status === "ACTIVE"
                                ? "bg-zinc-900 hover:bg-rose-950/60 border-zinc-800 hover:border-rose-700 text-zinc-400 hover:text-rose-300"
                                : "bg-emerald-950/70 hover:bg-emerald-900 border-emerald-700 text-emerald-200"
                            }`}
                            title={user.status === "ACTIVE" ? "Suspender acceso" : "Reactivar acceso"}
                          >
                            {user.status === "ACTIVE" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        )}

                        {/* Botón de cambiar contraseña */}
                        {!isOwner && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setNewPasswordInput("");
                              setIsResetPasswordOpen(true);
                            }}
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Restablecer contraseña"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                        )}

                        {/* Botón de editar datos */}
                        {!isOwner && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setEditUserData({
                                name: user.name,
                                role: user.role,
                                phone: user.phone || "",
                                status: user.status,
                              });
                              setIsEditUserOpen(true);
                            }}
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Editar miembro"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Botón eliminar */}
                        {!isOwner && !isSelf && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-900/60 border border-zinc-800 hover:border-rose-700 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Eliminar miembro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MATRIZ DE PERMISOS (MANAGER VS DJ) */}
      {activeTab === "matrix" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Banner de Ayuda y Contexto */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-950/40 via-zinc-900/90 to-cyan-950/40 border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-black text-white">
                  Personalización de Permisos para Manager y DJ
                </h2>
              </div>
              <p className="text-xs text-zinc-300 max-w-2xl">
                Activa o desactiva qué módulos y acciones puede ejecutar cada rol en tu establecimiento. Los cambios se
                propagan en tiempo real a las cabinas y pantallas conectadas.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isMatrixDirty && (
                <div className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-pulse">
                  ⚠️ Cambios pendientes de guardar
                </div>
              )}
            </div>
          </div>

          {/* Comparador de Roles: Tarjetas Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MANAGER CARD */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-purple-950/30 border-2 border-purple-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-black text-xs uppercase tracking-wider">
                  👔 ROL: MANAGER
                </span>
                <span className="text-xs font-mono text-purple-300 font-bold">
                  {rolePermissions.MANAGER?.length || 0} de {permissions.length} permisos
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Supervisión del local: mesas, promociones de barra, reportes de recaudación y control de eventos.
              </p>
              <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-300"
                  style={{
                    width: `${Math.round(((rolePermissions.MANAGER?.length || 0) / permissions.length) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* DJ CARD */}
            <div className="p-5 rounded-3xl bg-gradient-to-bl from-zinc-950 via-zinc-900 to-cyan-950/30 border-2 border-cyan-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-cyan-600 text-white font-black text-xs uppercase tracking-wider">
                  🎧 ROL: DJ CABINA
                </span>
                <span className="text-xs font-mono text-cyan-300 font-bold">
                  {rolePermissions.DJ?.length || 0} de {permissions.length} permisos
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Operación musical: cola en vivo, pistas karaoke, moderación de canciones y dinámicas interactivas en TV.
              </p>
              <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-300"
                  style={{
                    width: `${Math.round(((rolePermissions.DJ?.length || 0) / permissions.length) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Secciones de Permisos Agrupadas */}
          {(["dj_music", "screen_karaoke", "venue_tables", "admin_management"] as PermissionCategoryKey[]).map(
            (catKey) => {
              const cat = categories[catKey];
              const categoryPermissions = permissions.filter((p) => p.category === catKey);

              return (
                <div
                  key={catKey}
                  className="rounded-3xl bg-zinc-950/80 border border-zinc-800/80 overflow-hidden shadow-xl"
                >
                  {/* Encabezado de Categoría */}
                  <div className="px-5 py-4 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {catKey === "dj_music" && <Headphones className="w-5 h-5 text-cyan-400" />}
                      {catKey === "screen_karaoke" && <Tv className="w-5 h-5 text-pink-400" />}
                      {catKey === "venue_tables" && <Building2 className="w-5 h-5 text-purple-400" />}
                      {catKey === "admin_management" && <ShieldCheck className="w-5 h-5 text-amber-400" />}
                      <div>
                        <h3 className="font-black text-white text-sm sm:text-base">
                          {cat?.label || catKey}
                        </h3>
                        <p className="text-[11px] text-zinc-400">{cat?.description}</p>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-8 text-xs font-black uppercase tracking-wider text-zinc-400 pr-4">
                      <span className="w-24 text-center text-purple-400">MANAGER</span>
                      <span className="w-24 text-center text-cyan-400">DJ</span>
                    </div>
                  </div>

                  {/* Lista de Permisos en la Categoría */}
                  <div className="divide-y divide-zinc-800/60">
                    {categoryPermissions.map((perm) => {
                      const managerHas = rolePermissions.MANAGER?.includes(perm.id);
                      const djHas = rolePermissions.DJ?.includes(perm.id);

                      return (
                        <div
                          key={perm.id}
                          className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/30 transition-colors"
                        >
                          {/* Información del Permiso */}
                          <div className="space-y-0.5 max-w-xl">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-xs sm:text-sm">{perm.label}</span>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                                {perm.id}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">{perm.description}</p>
                          </div>

                          {/* Switches para Manager y DJ */}
                          <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/40">
                            {/* Switch Manager */}
                            <div className="flex items-center gap-2 sm:w-24 sm:justify-center">
                              <span className="text-[11px] font-bold text-purple-300 sm:hidden">Manager:</span>
                              <button
                                type="button"
                                onClick={() => handleTogglePermission("MANAGER", perm.id)}
                                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                                  managerHas ? "bg-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.4)]" : "bg-zinc-800"
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-full bg-white block transition-transform shadow-md absolute top-0.5 ${
                                    managerHas ? "translate-x-6" : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Switch DJ */}
                            <div className="flex items-center gap-2 sm:w-24 sm:justify-center">
                              <span className="text-[11px] font-bold text-cyan-300 sm:hidden">DJ:</span>
                              <button
                                type="button"
                                onClick={() => handleTogglePermission("DJ", perm.id)}
                                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                                  djHas ? "bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]" : "bg-zinc-800"
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-full bg-white block transition-transform shadow-md absolute top-0.5 ${
                                    djHas ? "translate-x-6" : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          )}

          {/* Barra Flotante de Guardar si hay cambios */}
          {isMatrixDirty && (
            <div className="sticky bottom-6 z-30 animate-fadeIn">
              <div className="p-4 rounded-3xl bg-zinc-950/95 border-2 border-purple-500 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-spin [animation-duration:8s]" />
                  <span className="text-xs sm:text-sm font-black text-white">
                    Tienes modificaciones sin guardar en los permisos de Manager y DJ
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRolePermissions(initialRolePermissions)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleSaveMatrix}
                    disabled={savingMatrix}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs sm:text-sm hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/60 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingMatrix ? "Guardando..." : "Guardar Cambios"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: AGREGAR NUEVO MIEMBRO */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-950 border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsAddUserOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/40 text-[11px] font-black uppercase">
                <Users className="w-3.5 h-3.5" />
                <span>Alta de Personal</span>
              </div>
              <h2 className="text-xl font-black text-white">Nuevo Miembro del Equipo</h2>
              <p className="text-xs text-zinc-400">
                Registra a un nuevo DJ, Manager o miembro del staff para tu establecimiento.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Alex Beat"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  placeholder="ej. dj@retrobar.com"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Selector de Rol Visual */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Rol a Asignar *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "MANAGER" as Role, name: "Manager", color: "purple", icon: "👔" },
                    { id: "DJ" as Role, name: "DJ Cabina", color: "cyan", icon: "🎧" },
                    { id: "OPERATOR" as Role, name: "Staff / Mesas", color: "emerald", icon: "🛡️" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setNewUserData({ ...newUserData, role: r.id })}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        newUserData.role === r.id
                          ? r.id === "MANAGER"
                            ? "bg-purple-950/80 border-purple-500 text-white shadow-lg shadow-purple-950/80"
                            : r.id === "DJ"
                            ? "bg-cyan-950/80 border-cyan-500 text-white shadow-lg shadow-cyan-950/80"
                            : "bg-emerald-950/80 border-emerald-500 text-white shadow-lg shadow-emerald-950/80"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="text-lg block mb-1">{r.icon}</span>
                      <span className="text-xs font-black block">{r.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">Contraseña de Acceso *</label>
                  <button
                    type="button"
                    onClick={() => setNewUserData({ ...newUserData, password: generateRandomPassword() })}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                  >
                    ⚡ Generar aleatoria
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Teléfono (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. +54 9 11 2233-4455"
                  value={newUserData.phone}
                  onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm cursor-pointer shadow-lg shadow-purple-950/60"
                >
                  {submittingUser ? "Creando..." : "Crear Miembro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR MIEMBRO */}
      {isEditUserOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-950 border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsEditUserOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">Editar Datos y Rol</h2>
              <p className="text-xs text-zinc-400">Modifica el rol asignado o información de {selectedUser.name}</p>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editUserData.name}
                  onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Selector de Rol */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Rol Asignado</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "MANAGER" as Role, name: "Manager" },
                    { id: "DJ" as Role, name: "DJ Cabina" },
                    { id: "OPERATOR" as Role, name: "Staff" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setEditUserData({ ...editUserData, role: r.id })}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        editUserData.role === r.id
                          ? r.id === "MANAGER"
                            ? "bg-purple-950/80 border-purple-500 text-white font-black"
                            : r.id === "DJ"
                            ? "bg-cyan-950/80 border-cyan-500 text-white font-black"
                            : "bg-emerald-950/80 border-emerald-500 text-white font-black"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <span className="text-xs block">{r.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Teléfono</label>
                <input
                  type="text"
                  value={editUserData.phone}
                  onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Estado de la Cuenta</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditUserData({ ...editUserData, status: "ACTIVE" })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      editUserData.status === "ACTIVE"
                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    Activo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUserData({ ...editUserData, status: "SUSPENDED" })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      editUserData.status === "SUSPENDED"
                        ? "bg-rose-950/80 border-rose-500 text-rose-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    Suspendido
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm cursor-pointer shadow-lg"
                >
                  {submittingUser ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESTABLECER CONTRASEÑA */}
      {isResetPasswordOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-950 border border-purple-500/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsResetPasswordOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black uppercase">
                <Key className="w-3.5 h-3.5" />
                <span>Seguridad de Acceso</span>
              </div>
              <h2 className="text-xl font-black text-white">Nueva Contraseña</h2>
              <p className="text-xs text-zinc-400">
                Asigna una nueva clave para el acceso de <strong className="text-white">{selectedUser.name}</strong>
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">Nueva Contraseña *</label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput(generateRandomPassword())}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                  >
                    ⚡ Generar aleatoria
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingUser || !newPasswordInput}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {submittingUser ? "Guardando..." : "Actualizar Clave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
