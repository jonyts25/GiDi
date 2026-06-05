/** Textos sugeridos por clave de área (Lectura, Visuales, Auditivas). */
export const FOLLOWUP_OBJECTIVE_SUGGESTIONS: Record<string, string[]> = {
  LECTURA: [
    "Discrimine y reproduzca secuencias visuales y fonológicas en palabras y pseudopalabras.",
    "Mejore la fluidez lectora y la comprensión literal de textos cortos adecuados a su nivel.",
  ],
  VISUALES: [
    "Discrimine y reproduzca estímulos visuales en diferentes posiciones, tamaños y distancias.",
    "Coordine la motricidad fina con el seguimiento visual en tareas de copia, trazo y puzzles.",
  ],
  AUDITIVAS: [
    "Discrimine sonidos ambientales y fonológicos en secuencias breves con y sin ruido de fondo.",
    "Responda con precisión a instrucciones verbales de dos y tres pasos.",
  ],
  AUDITIVO: [
    "Discrimine sonidos ambientales y fonológicos en secuencias breves con y sin ruido de fondo.",
    "Responda con precisión a instrucciones verbales de dos y tres pasos.",
  ],
};

export function suggestionsForArea(areaKey: string): string[] {
  const k = areaKey.toUpperCase();
  return FOLLOWUP_OBJECTIVE_SUGGESTIONS[k] ?? [];
}
