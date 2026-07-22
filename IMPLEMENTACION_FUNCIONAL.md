# Implementación funcional GCO

Versión integrada sobre el ZIP de navegación y calendario.

## Flujos habilitados
- Crear/editar eventos con campos ampliados de inscripción, capacidad, Táctica, comunicaciones, pieza y publicación.
- Estados completos del ciclo del evento.
- Publicación, apertura y cierre de inscripciones.
- Agenda del colaborador con inscripción, selección de sesiones, cancelación y lista de espera.
- Notificación informativa al líder sin aprobación automática.
- Participantes, solicitud formal de aprobación solo para seleccionados y asignación de cupos.
- Bandeja de aprobaciones con regla cualquiera/todos.
- Citaciones simuladas.
- Asistencia y cierre.
- Capacidad y analítica derivadas del store.
- Administración y auditoría.

## Alcance de simulación
Persistencia local mediante localStorage. Teams, correo, Excel, QR, Directorio Activo y cargas de archivo son simulados; requieren conectores/backend para producción.
