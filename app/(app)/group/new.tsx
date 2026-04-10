import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useCallback, useRef } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { Share } from "react-native";
import { useAuthStore } from "@/stores/auth";
import { useGroupsStore } from "@/stores/groups";
import { createGroup } from "@/lib/groups";
import { resolvePhone } from "@/lib/resolver";
import { parseTongoQr } from "@/lib/tongo";
import type { Group, GroupMember } from "@/lib/groups";

type Stage = "naming" | "adding_members" | "creating" | "done";

export default function NewGroup() {
  const { privyUserId, starknetAddress, tongoRecipientId } = useAuthStore();
  const { addGroup } = useGroupsStore();

  const selfMember: GroupMember = {
    userId: privyUserId!,
    tongoId: tongoRecipientId
      ? `tongo:${tongoRecipientId.x}:${tongoRecipientId.y}`
      : null,
    starknetAddress: starknetAddress,
    displayName: "You",
    phoneHash: null,
  };

  const [stage, setStage] = useState<Stage>("naming");
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([selfMember]);
  const [phoneQuery, setPhoneQuery] = useState("");
  const [phoneResult, setPhoneResult] = useState<
    GroupMember | null | "not_found" | "searching"
  >(null);
  const [tongoInput, setTongoInput] = useState("");
  const [showTongoInput, setShowTongoInput] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Phone search with debounce
  // ---------------------------------------------------------------------------

  const handlePhoneChange = useCallback((text: string) => {
    setPhoneQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setPhoneResult(null);
      return;
    }
    setPhoneResult("searching");
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await resolvePhone(text.trim());
        setPhoneResult(result ?? "not_found");
      } catch {
        setPhoneResult("not_found");
      }
    }, 500);
  }, []);

  function addFoundMember(m: GroupMember) {
    if (members.some((x) => x.userId === m.userId)) return;
    setMembers((prev) => [...prev, m]);
    setPhoneQuery("");
    setPhoneResult(null);
  }

  async function addUnknownMember() {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      phoneQuery.trim().replace(/\s/g, "")
    );
    if (members.some((x) => x.userId === hash)) return;
    setMembers((prev) => [
      ...prev,
      {
        userId: hash,
        tongoId: null,
        starknetAddress: null,
        displayName: phoneQuery.trim(),
        phoneHash: hash,
      },
    ]);
    setPhoneQuery("");
    setPhoneResult(null);
  }

  function removeMember(userId: string) {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  }

  // ---------------------------------------------------------------------------
  // Tongo address add
  // ---------------------------------------------------------------------------

  function addTongoMember() {
    const parsed = parseTongoQr(tongoInput.trim());
    if (!parsed) {
      Alert.alert(
        "Invalid address",
        "Enter a valid Tongo address in tongo:<x>:<y> format"
      );
      return;
    }
    const short =
      tongoInput.length > 20
        ? tongoInput.slice(0, 10) + "…" + tongoInput.slice(-6)
        : tongoInput;
    const newId = Crypto.randomUUID();
    if (members.some((m) => m.tongoId === tongoInput.trim())) return;
    setMembers((prev) => [
      ...prev,
      {
        userId: newId,
        tongoId: tongoInput.trim(),
        starknetAddress: null,
        displayName: short,
        phoneHash: null,
      },
    ]);
    setTongoInput("");
    setShowTongoInput(false);
  }

  // ---------------------------------------------------------------------------
  // Create group
  // ---------------------------------------------------------------------------

  async function handleCreate() {
    setStage("creating");
    try {
      const group = await createGroup(groupName.trim(), members, privyUserId!);
      addGroup(group);
      setCreatedGroup(group);
      setStage("done");
    } catch (e: any) {
      Alert.alert("Failed to create group", (e as Error).message);
      setStage("adding_members");
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (stage === "done" && createdGroup) {
    const inviteUrl = `spiceup://join?groupId=${createdGroup.id}&token=${createdGroup.inviteToken}`;
    return (
      <View className="flex-1 bg-neutral-950 px-6 justify-center items-center">
        <Ionicons name="checkmark-circle" size={56} color="#4CAF50" />
        <Text className="text-white text-2xl font-bold mt-4">
          Group "{createdGroup.name}" created!
        </Text>
        <Text className="text-neutral-400 text-sm mt-2 text-center">
          Invite members using the link below
        </Text>

        <Pressable
          onPress={() =>
            Share.share({
              message: `Join my SpiceUP group "${createdGroup.name}": ${inviteUrl}`,
            })
          }
          className="bg-purple-700 rounded-xl py-4 px-6 mt-8 w-full"
        >
          <Text className="text-white text-center font-bold">
            Share Invite Link
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace(`/(app)/group/${createdGroup.id}`)}
          className="bg-neutral-800 rounded-xl py-4 px-6 mt-3 w-full"
        >
          <Text className="text-white text-center font-semibold">
            Open Group
          </Text>
        </Pressable>
      </View>
    );
  }

  if (stage === "creating") {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <ActivityIndicator color="#7B5EA7" size="large" />
        <Text className="text-neutral-400 mt-4">Creating group…</Text>
      </View>
    );
  }

  if (stage === "naming") {
    return (
      <View className="flex-1 bg-neutral-950 px-6 pt-16">
        <Pressable onPress={() => router.back()} className="mb-6">
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text className="text-white text-2xl font-bold mb-2">New Group</Text>
        <Text className="text-neutral-400 mb-6">Give your group a name</Text>

        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder="e.g. Dinner with friends"
          placeholderTextColor="#555"
          className="bg-neutral-900 text-white rounded-xl px-4 py-4 text-lg"
          autoFocus
        />

        <Pressable
          onPress={() => setStage("adding_members")}
          disabled={groupName.trim().length < 2}
          className={`mt-6 rounded-xl py-4 ${
            groupName.trim().length < 2 ? "bg-neutral-800" : "bg-purple-700"
          }`}
        >
          <Text className="text-white text-center font-bold">Next</Text>
        </Pressable>
      </View>
    );
  }

  // adding_members stage
  return (
    <View className="flex-1 bg-neutral-950 pt-16">
      <View className="flex-row items-center px-4 mb-4">
        <Pressable onPress={() => setStage("naming")} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text className="text-white text-xl font-bold">Add Members</Text>
      </View>

      {/* Member chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 px-4 mb-4"
        contentContainerStyle={{ alignItems: "center" }}
      >
        {members.map((m) => (
          <View
            key={m.userId}
            className="flex-row items-center bg-neutral-800 rounded-full px-3 py-1 mr-2"
          >
            <Text className="text-white text-sm">{m.displayName}</Text>
            {m.userId !== privyUserId && (
              <Pressable onPress={() => removeMember(m.userId)} className="ml-1">
                <Ionicons name="close" size={14} color="#9ca3af" />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      <ScrollView className="flex-1 px-4">
        {/* Phone search */}
        <Text className="text-neutral-400 text-sm mb-2">Search by phone number</Text>
        <TextInput
          value={phoneQuery}
          onChangeText={handlePhoneChange}
          placeholder="+1 555 000 0000"
          placeholderTextColor="#555"
          keyboardType="phone-pad"
          className="bg-neutral-900 text-white rounded-xl px-4 py-3 mb-3"
        />

        {phoneResult === "searching" && (
          <ActivityIndicator color="#7B5EA7" className="mb-3" />
        )}

        {phoneResult && phoneResult !== "searching" && phoneResult !== "not_found" && (
          <View className="bg-neutral-900 rounded-xl p-4 mb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-white font-medium">{phoneResult.displayName}</Text>
              <Text className="text-neutral-500 text-xs">On SpiceUP</Text>
            </View>
            <Pressable
              onPress={() => addFoundMember(phoneResult as GroupMember)}
              className="bg-purple-700 px-4 py-2 rounded-lg"
            >
              <Text className="text-white text-sm font-medium">Add</Text>
            </Pressable>
          </View>
        )}

        {phoneResult === "not_found" && phoneQuery.trim().length > 0 && (
          <View className="bg-neutral-900 rounded-xl p-4 mb-3">
            <Text className="text-neutral-400 text-sm">
              Not on SpiceUP yet — they can join via invite link
            </Text>
            <Pressable
              onPress={addUnknownMember}
              className="bg-neutral-700 px-4 py-2 rounded-lg mt-2 self-start"
            >
              <Text className="text-neutral-300 text-sm">Add anyway</Text>
            </Pressable>
          </View>
        )}

        {/* Tongo address toggle */}
        <Pressable
          onPress={() => setShowTongoInput((v) => !v)}
          className="flex-row items-center mb-3"
        >
          <Ionicons name="link-outline" size={16} color="#7B5EA7" />
          <Text className="text-purple-400 text-sm ml-1">
            {showTongoInput ? "Hide" : "Paste Tongo address"}
          </Text>
        </Pressable>

        {showTongoInput && (
          <View className="mb-4">
            <TextInput
              value={tongoInput}
              onChangeText={setTongoInput}
              placeholder="tongo:<x>:<y>"
              placeholderTextColor="#555"
              autoCapitalize="none"
              className="bg-neutral-900 text-white rounded-xl px-4 py-3 mb-2"
            />
            <Pressable
              onPress={addTongoMember}
              disabled={!tongoInput.trim()}
              className={`py-2 px-4 rounded-lg self-start ${
                tongoInput.trim() ? "bg-purple-700" : "bg-neutral-800"
              }`}
            >
              <Text className="text-white text-sm">Add</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View className="px-4 pb-8">
        <Pressable
          onPress={handleCreate}
          disabled={members.length < 2}
          className={`rounded-xl py-4 ${
            members.length < 2 ? "bg-neutral-800" : "bg-purple-700"
          }`}
        >
          <Text className="text-white text-center font-bold">
            Create Group ({members.length} members)
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
