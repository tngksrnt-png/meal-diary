import { Suspense } from "react";
import RecordContent from "./RecordContent";

export default function RecordPage() {
  return (
    <Suspense>
      <RecordContent />
    </Suspense>
  );
}
