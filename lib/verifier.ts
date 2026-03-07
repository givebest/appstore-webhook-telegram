import {
  SignedDataVerifier,
  Environment,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import fs from "fs";
import path from "path";
import type { AppConfig } from "./apps.js";

function loadRootCAs(): Buffer[] {
  const certsDir = path.join(process.cwd(), "certs");
  return [
    fs.readFileSync(path.join(certsDir, "AppleRootCA-G2.cer")),
    fs.readFileSync(path.join(certsDir, "AppleRootCA-G3.cer")),
  ];
}

const rootCAs = loadRootCAs();

function createVerifiers(config: AppConfig): {
  sandbox: SignedDataVerifier;
  production: SignedDataVerifier;
} {
  return {
    sandbox: new SignedDataVerifier(rootCAs, true, Environment.SANDBOX, config.bundleId, undefined),
    production: new SignedDataVerifier(rootCAs, true, Environment.PRODUCTION, config.bundleId, config.appAppleId),
  };
}

const verifierCache = new Map<string, { sandbox: SignedDataVerifier; production: SignedDataVerifier }>();

function getVerifiers(config: AppConfig) {
  if (!verifierCache.has(config.bundleId)) {
    verifierCache.set(config.bundleId, createVerifiers(config));
  }
  return verifierCache.get(config.bundleId)!;
}

async function getVerifierForPayload(
  signedPayload: string,
  config: AppConfig
): Promise<{ verifier: SignedDataVerifier; notification: ResponseBodyV2DecodedPayload }> {
  const { sandbox, production } = getVerifiers(config);
  try {
    const notification = await sandbox.verifyAndDecodeNotification(signedPayload);
    return { verifier: sandbox, notification };
  } catch {
    const notification = await production.verifyAndDecodeNotification(signedPayload);
    return { verifier: production, notification };
  }
}

export async function verifyAndDecodeNotification(
  signedPayload: string,
  config: AppConfig
): Promise<{
  notification: ResponseBodyV2DecodedPayload;
  transactionInfo: JWSTransactionDecodedPayload | null;
}> {
  const { verifier, notification } = await getVerifierForPayload(signedPayload, config);

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
