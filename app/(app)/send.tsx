import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Amount } from "starkzap";
import type { Token, Address } from "starkzap";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { AmountInput } from "@/components/AmountInput";
import { ETH } from "@/constants/tokens";
import { parseTongoQr, sendPrivate } from "@/lib/tongo";

type Mode = "public" | "private";
type Stage = "input" | "reviewing" | "generating_proof" | "sending" | "done";

export default function Send() {
  const onboard = useAuthStore((s) => s.wallet);
  const tongo = useAuthStore((s) => s.tongo);
  const confidentialAvailable = useWalletStore((s) => s.confidentialAvailable);

  const [mode, setMode] = useState<Mode>("public");
  const [recipient, setRecipient] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [token, setToken] = useState<Token>(ETH);
  const [stage, setStage] = useState<Stage>("input");
  const [txHash, setTxHash] = useState("");
  const [explorerUrl, setExplorerUrl] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { recordTx } = useTransactionHistory();

  // -------------------------------------------------------------------------
  // Public send
  // -------------------------------------------------------------------------

  async function reviewPublic() {
    if (!onboard || !recipient || !amountStr) return;
    setStage("reviewing");
    try {
      const amount = Amount.parse(amountStr, token);
      const result = await onboard.wallet
        .tx()
        .transfer(token, { to: recipient as Address, amount })
        .preflight();
      if (!result.ok) {
        Alert.alert("Transaction would fail", result.reason ?? "Unknown error");
        setStage("input");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? String(e));
      setStage("input");
    }
  }

  async function sendPublic() {
    if (!onboard || !recipient || !amountStr) return;
    setStage("sending");
    try {
      const amount = Amount.parse(amountStr, token);
      const tx = await onboard.wallet
        .tx()
        .transfer(token, { to: recipient as Address, amount })
        .send();
      setTxHash(tx.hash);
      setExplorerUrl(tx.explorerUrl);
      await tx.wait();

      await recordTx({
        id: tx.hash,
        type: "send",
        amount: amountStr,
        token: token.symbol,
        counterparty: recipient,
        timestamp: Date.now(),
        txHash: tx.hash,
        isPrivate: false,
      });

      setStage("done");
    } catch (e: any) {
      Alert.alert("Transaction failed", e.message ?? String(e));
      setStage("input");
    }
  }

  // -------------------------------------------------------------------------
  // Private send
  // -------------------------------------------------------------------------

  async function reviewPrivate() {
    if (!onboard || !tongo || !recipient || !amountStr) return;
    const parsed = parseTongoQr(recipient);
    if (!parsed) {
      Alert.alert("Invalid address", "Enter a valid Tongo address (tongo:<x>:<y>)");
      return;
    }
    setStage("reviewing");
    try {
      const amount = Amount.parse(amountStr, token);
      const result = await onboard.wallet
        .tx()
        .confidentialTransfer(tongo, { amount, to: parsed, sender: onboard.wallet.address })
        .preflight();
      if (!result.ok) {
        Alert.alert("Transaction would fail", result.reason ?? "Unknown error");
        setStage("input");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? String(e));
      setStage("input");
    }
  }

  async function sendPrivateTransfer() {
    if (!onboard || !tongo || !recipient || !amountStr) return;
    const parsed = parseTongoQr(recipient);
    if (!parsed) return;

    // First show proof generation stage, then switch to sending once SDK submits
    setStage("generating_proof");
    try {
      const tx = await sendPrivate(onboard, tongo, parsed, amountStr, token);
      // By the time send() returns, proof is done and tx is submitted
      setStage("sending");
      setTxHash(tx.hash);
      setExplorerUrl(tx.explorerUrl);
      await tx.wait();

      await recordTx({
        id: tx.hash,
        type: "send",
        amount: amountStr,
        token: token.symbol,
        counterparty: recipient,
        timestamp: Date.now(),
        txHash: tx.hash,
        isPrivate: true,
      });

      setStage("done");
    } catch (e: any) {
      Alert.alert("Transaction failed", e.message ?? String(e));
      setStage("input");
    }
  }

  // -------------------------------------------------------------------------
  // QR scanning
  // -------------------------------------------------------------------------

  async function openScanner() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert("Camera permission required", "Allow camera access to scan QR codes.");
        return;
      }
    }
    setShowScanner(true);
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    const parsed = parseTongoQr(data);
    if (parsed) {
      setRecipient(data);
      setShowScanner(false);
    } else {
      Alert.alert("Invalid QR", "This is not a valid Tongo address QR code.");
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function reset() {
    setRecipient("");
    setAmountStr("");
    setTxHash("");
    setExplorerUrl("");
    setStage("input");
  }

  const isPrivate = mode === "private";

  // -------------------------------------------------------------------------
  // Done screen
  // -------------------------------------------------------------------------

  if (stage === "done") {
    return (
      <View className="flex-1 bg-background px-6 justify-center items-center">
        <Text className="text-green-400 text-2xl font-bold mb-4">Sent!</Text>
        {isPrivate && (
          <View className="bg-purple-900/40 border border-purple-800 px-3 py-1 rounded-full mb-3">
            <Text className="text-purple-300 text-xs">Private — amount hidden on-chain</Text>
          </View>
        )}
        <Text className="text-neutral-400 text-sm mb-2">
          {amountStr} {token.symbol} to {recipient.slice(0, 14)}...
        </Text>
        <Text className="text-neutral-500 text-xs mb-8" numberOfLines={1}>
          {explorerUrl}
        </Text>
        <Pressable onPress={reset} className="bg-accent p-4 rounded-xl w-full">
          <Text className="text-white text-center font-semibold">Send another</Text>
        </Pressable>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Main screen
  // -------------------------------------------------------------------------

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="text-white text-2xl font-bold mb-6">Send</Text>

      {/* Public / Private mode toggle */}
      <View className="flex-row bg-neutral-900 rounded-xl p-1 mb-6">
        <Pressable
          onPress={() => { setMode("public"); setRecipient(""); }}
          className={`flex-1 p-3 rounded-lg ${mode === "public" ? "bg-accent" : ""}`}
          disabled={stage !== "input"}
        >
          <Text className={`text-center font-medium ${mode === "public" ? "text-white" : "text-neutral-400"}`}>
            Public
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { setMode("private"); setRecipient(""); }}
          className={`flex-1 p-3 rounded-lg ${mode === "private" ? "bg-purple-700" : ""}`}
          disabled={stage !== "input" || !confidentialAvailable}
        >
          <Text className={`text-center font-medium ${mode === "private" ? "text-white" : confidentialAvailable ? "text-neutral-400" : "text-neutral-700"}`}>
            Private
          </Text>
        </Pressable>
      </View>

      {/* Recipient */}
      <Text className="text-neutral-400 text-sm mb-2">
        {isPrivate ? "Recipient Tongo address" : "Recipient address"}
      </Text>
      <View className="flex-row items-center mb-4">
        <TextInput
          value={recipient}
          onChangeText={setRecipient}
          placeholder={isPrivate ? "tongo:<x>:<y>" : "0x..."}
          placeholderTextColor="#666"
          className="flex-1 bg-neutral-900 text-white p-4 rounded-xl"
          autoCapitalize="none"
          editable={stage === "input"}
        />
        {isPrivate && stage === "input" && (
          <Pressable
            onPress={openScanner}
            className="ml-2 bg-neutral-900 p-4 rounded-xl"
          >
            <Text className="text-purple-400 text-sm">Scan</Text>
          </Pressable>
        )}
      </View>

      {/* Private mode indicator */}
      {isPrivate && (
        <View className="bg-purple-900/20 border border-purple-900/50 p-3 rounded-xl mb-4">
          <Text className="text-purple-300 text-xs text-center">
            Amount will be hidden on-chain via ZK proof
          </Text>
        </View>
      )}

      {/* Amount */}
      <Text className="text-neutral-400 text-sm mb-2">Amount</Text>
      <AmountInput
        value={amountStr}
        onChangeText={setAmountStr}
        selectedToken={token}
        onSelectToken={setToken}
      />

      {/* Actions */}
      <View className="mt-8">
        {stage === "input" && (
          <Pressable
            onPress={isPrivate ? reviewPrivate : reviewPublic}
            className={`p-4 rounded-xl ${isPrivate ? "bg-purple-700" : "bg-accent"}`}
            disabled={!recipient || !amountStr}
          >
            <Text className="text-white text-center font-semibold">Review</Text>
          </Pressable>
        )}

        {stage === "reviewing" && (
          <View>
            <View className="bg-neutral-900 p-4 rounded-xl mb-3">
              <Text className="text-green-400 text-sm mb-1">Preflight passed</Text>
              <Text className="text-white">
                Send {amountStr} {token.symbol} to {recipient.slice(0, 14)}...
              </Text>
              {isPrivate && (
                <Text className="text-purple-400 text-xs mt-1">Private transfer — amount hidden</Text>
              )}
            </View>
            <Pressable
              onPress={isPrivate ? sendPrivateTransfer : sendPublic}
              className={`p-4 rounded-xl mb-2 ${isPrivate ? "bg-purple-700" : "bg-green-700"}`}
            >
              <Text className="text-white text-center font-semibold">Confirm & Send</Text>
            </Pressable>
            <Pressable onPress={() => setStage("input")} className="p-3">
              <Text className="text-neutral-400 text-center">Cancel</Text>
            </Pressable>
          </View>
        )}

        {stage === "generating_proof" && (
          <View className="items-center py-4">
            <ActivityIndicator color="#7B5EA7" />
            <Text className="text-purple-400 mt-2 font-medium">Generating ZK proof...</Text>
            <Text className="text-neutral-500 text-xs mt-1">This takes less than a second</Text>
          </View>
        )}

        {stage === "sending" && (
          <View className="items-center py-4">
            <ActivityIndicator color="#7B5EA7" />
            <Text className="text-neutral-400 mt-2">
              {isPrivate ? "Verifying on-chain..." : "Sending transaction..."}
            </Text>
          </View>
        )}
      </View>

      {/* QR Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View className="flex-1 bg-black">
          <CameraView
            className="flex-1"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <Pressable
            onPress={() => setShowScanner(false)}
            className="absolute bottom-12 left-6 right-6 bg-neutral-900 p-4 rounded-xl"
          >
            <Text className="text-white text-center font-semibold">Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
