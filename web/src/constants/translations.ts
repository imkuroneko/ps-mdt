/** Spanish translations for MDT tab names and labels */
export const TAB_TRANSLATIONS: Record<string, string> = {
	// Main tabs
	Dashboard: "Panel de Control",
	Citizens: "Ciudadanos",
	Reports: "Reportes",
	Cases: "Casos",
	Evidence: "Evidencia",
	BOLOs: "BOLOs",
	Warrants: "Órdenes",
	Vehicles: "Vehículos",
	Weapons: "Armas",
	Charges: "Cargos",
	Awards: "Reconocimientos",
	Roster: "Nómina",
	Map: "Mapa",
	Cameras: "Cámaras",
	Bodycams: "Cámaras Corporales",
	IA: "Asuntos Internos",
	PPR: "Revisión de Desempeño",
	FTO: "Entrenamiento de Campo",
	SOP: "Procedimientos Estándar",
	"Court Cases": "Casos Judiciales",
	"Warrant Review": "Revisión de Órdenes",
	"Court Orders": "Órdenes Judiciales",
	"Legal Documents": "Documentos Legales",
	Preferences: "Preferencias",
	Settings: "Configuración",
};

/** Spanish translations for section labels */
export const LABEL_TRANSLATIONS: Record<string, string> = {
	Operations: "Operaciones",
	Records: "Registros",
	Personnel: "Personal",
	Surveillance: "Vigilancia",
	Court: "Juzgado",
	Legal: "Legal",
};

/** Get translated tab name or fallback to original */
export function getTabTranslation(tabName: string): string {
	return TAB_TRANSLATIONS[tabName] || tabName;
}

/** Get translated label or fallback to original */
export function getLabelTranslation(label: string): string {
	return LABEL_TRANSLATIONS[label] || label;
}
