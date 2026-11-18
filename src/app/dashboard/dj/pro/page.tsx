import { Metadata } from "next";
import AudioCabinaProView from "@/components/dj/AudioCabinaProView";

export const metadata: Metadata = {
  title: "ZYNKO - Cabina Audio Pro (Auto-DJ Dual-Deck)",
  description: "Cabina DJ Dual-Deck profesional con bandejas fijadas y motor de auto-reproducción continua (Auto-DJ).",
};

export default function AudioCabinaProPage() {
  return <AudioCabinaProView />;
}
