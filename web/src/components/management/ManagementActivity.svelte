<script lang="ts">
	import { onMount } from "svelte";
	import { fetchNui } from "../../utils/fetchNui";
	import { isEnvBrowser } from "../../utils/misc";
	import { NUI_EVENTS } from "../../constants/nuiEvents";
	import Pagination from "../Pagination.svelte";

	interface AuditLog {
		id: number;
		actor_name: string;
		action: string;
		entity_type: string;
		entity_id: string | null;
		details: string | null;
		created_at: string;
	}

	interface PaginatedResponse {
		items: AuditLog[];
		total: number;
		page: number;
		perPage: number;
	}

	const ACTION_LABELS: Record<string, string> = {
		mdt_login: "Inició sesión en MDT",
		mdt_logout: "Cerró sesión en MDT",
		report_created: "Creó un reporte",
		report_updated: "Actualizó un reporte",
		report_deleted: "Eliminó un reporte",
		warrant_issued: "Emitió una orden judicial",
		warrant_closed: "Cerró una orden judicial",
		case_created: "Creó un caso",
		case_updated: "Actualizó un caso",
		case_deleted: "Eliminó un caso",
		case_officer_assigned: "Asignó oficial al caso",
		case_officer_removed: "Removió oficial del caso",
		case_attachment_added: "Añadió archivo al caso",
		case_attachment_removed: "Removió archivo del caso",
		case_attachment_uploaded: "Subió archivo del caso",
		evidence_added: "Añadió evidencia",
		evidence_updated: "Actualizó evidencia",
		evidence_deleted: "Eliminó evidencia",
		evidence_transferred: "Transfirió custodia de evidencia",
		evidence_image_added: "Añadió imagen de evidencia",
		evidence_image_removed: "Removió imagen de evidencia",
		evidence_linked_case: "Vinculó evidencia a caso",
		case_created_from_evidence: "Creó caso desde evidencia",
		weapon_created: "Registró un arma",
		weapon_updated: "Actualizó registro de arma",
		weapon_deleted: "Eliminó registro de arma",
		vehicle_updated: "Actualizó registro de vehículo",
		vehicle_impounded: "Confiscó un vehículo",
		vehicle_released: "Liberó vehículo del depósito",
		search_citizens: "Buscó ciudadanos",
		search_players: "Buscó jugadores",
		search_officers: "Buscó oficiales",
		fine_processed: "Procesó una multa",
		charge_updated: "Actualizó un cargo",
		arrest_logged: "Registró un arresto",
		sent_to_jail: "Envió ciudadano a cárcel",
		callsign_changed: "Cambió indicativo del oficial",
		signal100_activated: "Activó Señal 100",
		signal100_deactivated: "Desactivó Señal 100",
		icu_deleted: "Eliminó registro de UCI",
	};

	const ACTION_ICONS: Record<string, { icon: string; color: string }> = {
		mdt_login: { icon: "login", color: "#3b82f6" },
		mdt_logout: { icon: "logout", color: "#6b7280" },
		report_created: { icon: "description", color: "#10b981" },
		report_updated: { icon: "edit_note", color: "#f59e0b" },
		report_deleted: { icon: "delete", color: "#ef4444" },
		warrant_issued: { icon: "gavel", color: "#ef4444" },
		warrant_closed: { icon: "check_circle", color: "#10b981" },
		case_created: { icon: "folder_open", color: "#3b82f6" },
		case_updated: { icon: "folder", color: "#f59e0b" },
		case_deleted: { icon: "folder_delete", color: "#ef4444" },
		evidence_added: { icon: "inventory_2", color: "#8b5cf6" },
		evidence_deleted: { icon: "delete", color: "#ef4444" },
		vehicle_updated: { icon: "directions_car", color: "#f59e0b" },
		vehicle_impounded: { icon: "local_parking", color: "#ef4444" },
		arrest_logged: { icon: "front_hand", color: "#ef4444" },
		fine_processed: { icon: "payments", color: "#f59e0b" },
		search_citizens: { icon: "person_search", color: "#6b7280" },
	};

	let activities: AuditLog[] = $state([]);
	let isLoading = $state(false);
	let searchQuery = $state("");
	let currentPage = $state(1);
	let totalItems = $state(0);
	let perPage = $state(25);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	let totalPages = $derived(Math.max(1, Math.ceil(totalItems / perPage)));

	function getActionLabel(action: string): string {
		return ACTION_LABELS[action] || action.replace(/_/g, " ");
	}

	function getActionIcon(action: string): { icon: string; color: string } {
		return ACTION_ICONS[action] || { icon: "info", color: "rgba(59, 130, 246, 0.6)" };
	}

	function getEntityLabel(log: AuditLog): string {
		if (!log.entity_id) return "";
		const typeLabels: Record<string, string> = {
			profile: "Perfil",
			report: "Reporte",
			warrant: "Orden Judicial",
			case: "Caso",
			evidence: "Evidencia",
			vehicle: "Vehículo",
			weapon: "Arma",
			citizen: "Ciudadano",
			search: "",
			dispatch: "Canal",
			fine: "Multa",
			charge: "Cargo",
			arrest: "Arresto",
			icu: "UCI",
			case_attachment: "Archivo",
			evidence_image: "Imagen",
			officer: "Oficial",
		};
		const label = typeLabels[log.entity_type] || log.entity_type;
		return label ? `${label} #${log.entity_id}` : `#${log.entity_id}`;
	}

	function formatTimestamp(value: string): string {
		if (!value) return "Desconocido";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return "Justo ahora";
		if (mins < 60) return `hace ${mins}m`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `hace ${hours}h`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `hace ${days}d`;
		return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	function formatFullTimestamp(value: string): string {
		if (!value) return "";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleString();
	}

	async function loadActivity(page = 1) {
		if (isEnvBrowser()) return;
		try {
			isLoading = true;
			const response = await fetchNui<PaginatedResponse>(
				NUI_EVENTS.AUDIT.GET_AUDIT_LOGS,
				{ limit: perPage, page, search: searchQuery.trim() || undefined },
				{ items: [], total: 0, page: 1, perPage: 25 },
			);
			if (response && response.items) {
				activities = response.items;
				totalItems = response.total || 0;
				currentPage = response.page || page;
			} else if (Array.isArray(response)) {
				activities = response as unknown as AuditLog[];
				totalItems = activities.length;
				currentPage = 1;
			} else {
				activities = [];
				totalItems = 0;
			}
		} catch (error) {
			console.error("Error al cargar actividad:", error);
			activities = [];
			totalItems = 0;
		} finally {
			isLoading = false;
		}
	}

	function goToPage(page: number) {
		if (page < 1 || page > totalPages || page === currentPage) return;
		loadActivity(page);
	}


	function handleSearch(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		searchQuery = value;
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentPage = 1;
			loadActivity(1);
		}, 400);
	}

	onMount(() => {
		if (isEnvBrowser()) {
			activities = [
				{ id: 1, actor_name: "D2020 Sgt. J. Miller", action: "report_created", entity_type: "report", entity_id: "RPT-001", details: null, created_at: new Date(Date.now() - 300000).toISOString(), },
				{ id: 2, actor_name: "D2020 Det. R. Santos", action: "warrant_issued", entity_type: "warrant", entity_id: "5", details: null, created_at: new Date(Date.now() - 3600000).toISOString(), },
				{ id: 3, actor_name: "D2020 Ofc. K. Chen", action: "case_created", entity_type: "case", entity_id: "42", details: null, created_at: new Date(Date.now() - 7200000).toISOString(), },
				{ id: 4, actor_name: "D2020 Lt. A. Brooks", action: "mdt_login", entity_type: "profile", entity_id: "BVX67053", details: null, created_at: new Date(Date.now() - 86400000).toISOString(), },
				{ id: 5, actor_name: "D2020 Ofc. M. Torres", action: "evidence_added", entity_type: "evidence", entity_id: "12", details: null, created_at: new Date(Date.now() - 172800000).toISOString(), },
			];
			totalItems = 5;
			return;
		}
		loadActivity(1);
	});
</script>

<div class="activity-panel">
	<div class="activity-topbar">
		<input
			type="text"
			placeholder="Buscar actividad..."
			value={searchQuery}
			oninput={handleSearch}
			class="search-input"
		/>
			<span class="result-count">{totalItems} registros</span>
	</div>

	{#if isLoading}
		<div class="empty-state">
			<div class="loading-spinner"></div>
				<p>Cargando...</p>
		</div>
	{:else}
		<div class="activity-list">
			{#each activities as log (log.id)}
				{@const iconData = getActionIcon(log.action)}
				<div class="activity-row">
					<div class="activity-icon" style="background: {iconData.color}15; color: {iconData.color}">
						<span class="material-icons">{iconData.icon}</span>
					</div>
					<div class="activity-body">
						<span class="activity-action">{getActionLabel(log.action)}</span>
						{#if getEntityLabel(log)}
							<span class="activity-entity">{getEntityLabel(log)}</span>
						{/if}
					</div>
					<div class="activity-meta">
						<span class="activity-officer">{log.actor_name || "Desconocido"}</span>
						<span class="activity-time" title={formatFullTimestamp(log.created_at)}>{formatTimestamp(log.created_at)}</span>
					</div>
				</div>
			{:else}
				<div class="empty-state">
					{searchQuery ? "Sin resultados." : "Sin actividad."}
				</div>
			{/each}
		</div>

		<Pagination
			currentPage={currentPage}
			totalItems={totalItems}
			perPage={perPage}
			onPageChange={(p) => loadActivity(p)}
			onPerPageChange={(pp) => { perPage = pp; loadActivity(1); }}
		/>
	{/if}
</div>

<style>
	.activity-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: transparent;
		overflow: hidden;
	}

	.activity-topbar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 16px;
		height: 36px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		max-width: 360px;
		background: transparent;
		border: none;
		padding: 0;
		color: rgba(255, 255, 255, 0.8);
		font-size: 11px;
	}

	.search-input:focus {
		outline: none;
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.2);
	}

	.result-count {
		color: rgba(255, 255, 255, 0.2);
		font-size: 10px;
		margin-left: auto;
	}

	.activity-list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	.activity-list::-webkit-scrollbar {
		width: 4px;
	}

	.activity-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.activity-list::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.06);
		border-radius: 2px;
	}

	.activity-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
		transition: background 0.1s;
	}

	.activity-row:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	.activity-row:last-child {
		border-bottom: none;
	}

	.activity-icon {
		width: 24px;
		height: 24px;
		min-width: 24px;
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.activity-icon .material-icons {
		font-size: 13px;
	}

	.activity-body {
		display: flex;
		flex-direction: column;
		gap: 1px;
		flex: 1;
		min-width: 0;
	}

	.activity-action {
		color: rgba(255, 255, 255, 0.8);
		font-size: 11px;
		font-weight: 500;
	}

	.activity-entity {
		font-size: 10px;
		color: rgba(var(--accent-text-rgb), 0.7);
		font-weight: 500;
	}

	.activity-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 1px;
		flex-shrink: 0;
	}

	.activity-officer {
		color: rgba(255, 255, 255, 0.35);
		font-size: 10px;
		white-space: nowrap;
	}

	.activity-time {
		color: rgba(255, 255, 255, 0.2);
		font-size: 10px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		color: rgba(255, 255, 255, 0.35);
		font-size: 11px;
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid rgba(255, 255, 255, 0.06);
		border-left: 2px solid rgba(var(--accent-rgb), 0.5);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 10px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>
