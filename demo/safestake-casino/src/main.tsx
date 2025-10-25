import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { WithWalletConnector, TESTNET } from "@concordium/react-components";
import { BROWSER_WALLET } from "./config";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WithWalletConnector network={TESTNET}>
      {(props) => <App {...props} connectorType={BROWSER_WALLET} />}
    </WithWalletConnector>
  </React.StrictMode>
);
