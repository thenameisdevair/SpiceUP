"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, CheckCircle2, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useGroups } from "@/hooks/useGroups";
import { avatarColorForName } from "@/lib/groups";

type NewGroupStage = "naming" | "adding_members" | "done";

interface AddedMember {
  id: string;
  name: string;
  color: string;
}

export default function NewGroupPage() {
  const router = useRouter();
  const { createGroup } = useGroups();
  const [stage, setStage] = useState<NewGroupStage>("naming");
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<AddedMember[]>([]);
  const [memberInput, setMemberInput] = useState("");
  const [error, setError] = useState("");
  const [createdGroupId, setCreatedGroupId] = useState("");
  const [creating, setCreating] = useState(false);

  const handleNameSubmit = useCallback(() => {
    const trimmed = groupName.trim();
    if (trimmed.length < 2) {
      setError("Group name must be at least 2 characters");
      return;
    }
    setError("");
    setStage("adding_members");
  }, [groupName]);

  const handleAddMember = useCallback(() => {
    const name = memberInput.trim();
    if (!name) return;
    if (members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      setError("Member already added");
      return;
    }
    const id = name.toLowerCase().replace(/\s+/g, "-");
    setMembers((prev) => [
      ...prev,
      { id, name, color: avatarColorForName(name) },
    ]);
    setMemberInput("");
    setError("");
  }, [memberInput, members]);

  const handleRemoveMember = useCallback((id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (members.length < 1) {
      setError("Add at least 1 member");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const group = await createGroup({
        name: groupName.trim(),
        members: members.map((member) => ({
          name: member.name,
          color: member.color,
        })),
      });

      setCreatedGroupId(group.id);
      setStage("done");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "We couldn't create this group yet."
      );
    } finally {
      setCreating(false);
    }
  }, [createGroup, groupName, members]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (stage === "naming") handleNameSubmit();
        else if (stage === "adding_members" && memberInput.trim()) handleAddMember();
      }
    },
    [stage, handleNameSubmit, handleAddMember, memberInput],
  );

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            if (stage === "adding_members") setStage("naming");
            else if (stage === "done") setStage("adding_members");
            else router.push("/groups");
          }}
          className="text-spiceup-text-muted hover:text-white transition-colors p-1 -m-1"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-lg font-bold">New Group</h1>
      </div>

      {/* Stage indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["naming", "adding_members", "done"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i <= ["naming", "adding_members", "done"].indexOf(stage)
                  ? "bg-spiceup-accent text-white"
                  : "bg-white/10 text-spiceup-text-muted"
              }`}
            >
              {i < ["naming", "adding_members", "done"].indexOf(stage) ? (
                <CheckCircle2 size={16} />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && (
              <div
                className={`w-8 h-0.5 rounded-full transition-colors ${
                  i < ["naming", "adding_members", "done"].indexOf(stage)
                    ? "bg-spiceup-accent"
                    : "bg-white/10"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ===== NAMING STAGE ===== */}
        {stage === "naming" && (
          <motion.div
            key="naming"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-spiceup-accent/10 flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-spiceup-accent" />
              </div>
              <h2 className="text-white text-lg font-semibold">Name your group</h2>
              <p className="text-spiceup-text-muted text-sm mt-1">
                Give it a fun name for your crew
              </p>
            </div>

            <Input
              label="Group Name"
              placeholder="e.g. Dinner Squad, Trip Fund..."
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              error={error}
              autoFocus
            />

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={groupName.trim().length < 2}
              onClick={handleNameSubmit}
            >
              Continue
            </Button>
          </motion.div>
        )}

        {/* ===== ADDING MEMBERS STAGE ===== */}
        {stage === "adding_members" && (
          <motion.div
            key="adding_members"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <h2 className="text-white text-lg font-semibold">
                Add members to &ldquo;{groupName.trim()}&rdquo;
              </h2>
              <p className="text-spiceup-text-muted text-sm mt-1">
                Add the people who will share expenses in this group
              </p>
            </div>

            <Input
              label="Add Member"
              placeholder="Enter a name..."
              value={memberInput}
              onChange={(e) => {
                setMemberInput(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              icon={<UserPlus size={16} />}
              error={error}
            />

            <Button
              variant="secondary"
              size="md"
              className="w-full"
              disabled={!memberInput.trim()}
              onClick={handleAddMember}
            >
              <UserPlus size={16} />
              Add Member
            </Button>

            {/* Member chips */}
            {members.length > 0 && (
              <div className="space-y-2">
                <p className="text-spiceup-text-secondary text-sm font-medium">
                  Members ({members.length + 1}){" "}
                  <span className="text-spiceup-text-muted">(including you)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {/* Self chip (always included) */}
                  <div className="flex items-center gap-2 bg-spiceup-accent/15 text-spiceup-accent px-3 py-1.5 rounded-full text-sm font-medium">
                    <div className="w-5 h-5 rounded-full bg-spiceup-accent flex items-center justify-center text-[9px] font-bold text-white">
                      YO
                    </div>
                    You
                  </div>
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 bg-white/5 border border-spiceup-border px-3 py-1.5 rounded-full text-sm"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-white">{m.name}</span>
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-spiceup-text-muted hover:text-white transition-colors ml-1"
                        aria-label={`Remove ${m.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={members.length < 1}
              loading={creating}
              onClick={handleCreateGroup}
            >
              Create Group
            </Button>
          </motion.div>
        )}

        {/* ===== DONE STAGE ===== */}
        {stage === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center py-12 space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.1,
              }}
              className="w-20 h-20 rounded-full bg-spiceup-success/10 flex items-center justify-center"
            >
              <CheckCircle2 size={40} className="text-spiceup-success" />
            </motion.div>
            <div className="text-center">
              <p className="text-white text-xl font-bold mb-1">Group Created!</p>
              <p className="text-spiceup-text-secondary text-sm">
                &ldquo;{groupName.trim()}&rdquo; is ready with{" "}
                {members.length + 1} members
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => router.push(`/groups/${createdGroupId}`)}
              >
                Open Group
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => router.push("/groups")}
              >
                Back to Groups
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
