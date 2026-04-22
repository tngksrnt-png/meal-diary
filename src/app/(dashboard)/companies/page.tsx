import { redirect } from "next/navigation";

export default function CompaniesListRedirect() {
  redirect("/employees");
}
