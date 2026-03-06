import {
  SignedDataVerifier,
  Environment,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import fs from "fs";
import path from "path";

function loadRootCAs(): Buffer[] {
  const certsDir = path.join(process.cwd(), "certs");
  return [
    fs.readFileSync(path.join(certsDir, "AppleRootCA-G2.cer")),
    fs.readFileSync(path.join(certsDir, "AppleRootCA-G3.cer")),
  ];
}

const bundleId = process.env.APPLE_BUNDLE_ID!;
const appAppleId = process.env.APPLE_APP_APPLE_ID
  ? parseInt(process.env.APPLE_APP_APPLE_ID, 10)
  : undefined;

let _sandboxVerifier: SignedDataVerifier | null = null;
let _productionVerifier: SignedDataVerifier | null = null;

function getSandboxVerifier(): SignedDataVerifier {
  if (!_sandboxVerifier) {
    _sandboxVerifier = new SignedDataVerifier(
      loadRootCAs(),
      true,
      Environment.SANDBOX,
      bundleId,
      undefined
    );
  }
  return _sandboxVerifier;
}

function getProductionVerifier(): SignedDataVerifier {
  if (!_productionVerifier) {
    _productionVerifier = new SignedDataVerifier(
      loadRootCAs(),
      true,
      Environment.PRODUCTION,
      bundleId,
      appAppleId
    );
  }
  return _productionVerifier;
}

async function getVerifierForPayload(
  signedPayload: string
): Promise<{ verifier: SignedDataVerifier; notification: ResponseBodyV2DecodedPayload }> {
  try {
    const notification = await getSandboxVerifier().verifyAndDecodeNotification(signedPayload);
    return { verifier: getSandboxVerifier(), notification };
  } catch {
    const notification = await getProductionVerifier().verifyAndDecodeNotification(signedPayload);
    return { verifier: getProductionVerifier(), notification };
  }
}

export async function verifyAndDecodeNotification(signedPayload: string): Promise<{
  notification: ResponseBodyV2DecodedPayload;
  transactionInfo: JWSTransactionDecodedPayload | null;
}> {
  const { verifier, notification } = await getVerifierForPayload(signedPayload);

  let transactionInfo: JWSTransactionDecodedPayload | null = null;
  if (notification.data?.signedTransactionInfo) {
    try {
      transactionInfo = await verifier.verifyAndDecodeTransaction(
        notification.data.signedTransactionInfo
      );
    } catch (err) {
      console.error("[verifier] failed to decode signedTransactionInfo:", err);
    }
  }

  return { notification, transactionInfo };
}
