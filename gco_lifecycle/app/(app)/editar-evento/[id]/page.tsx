import { EventForm } from "@/components/gco/event-form"

export default async function EditarEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EventForm eventId={id} />
}
