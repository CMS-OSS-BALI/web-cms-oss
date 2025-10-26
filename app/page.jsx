import { redirect } from "next/navigation";
import LandingPage from "./(view)/user/(panel)/landing-page/page";
import PanelLayout from "./(view)/user/(panel)/layout";

export default function Home() {
  return (
    <PanelLayout>
      <LandingPage />
    </PanelLayout>
  );
}
