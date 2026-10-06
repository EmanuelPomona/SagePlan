import { DataProvider } from "./data/DataProvider.tsx";
import { Page } from "./layout/Page.tsx";

export function App() {
  return (
    <DataProvider>
      <Page />
    </DataProvider>
  );
}
