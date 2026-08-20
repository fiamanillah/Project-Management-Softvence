"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { MessageSquare, Send } from "lucide-react";
import { useTaskStore } from "../../data/task-store";
import type { TaskComment } from "../../types";

interface TaskCommentsProps {
  taskId: string;
  comments: TaskComment[];
}

export function TaskComments({ taskId, comments }: TaskCommentsProps) {
  const { addComment, currentUser } = useTaskStore();
  const [content, setContent] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addComment(taskId, content.trim());
    setContent("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h4 className="text-xs font-bold text-foreground">
          Discussion & Team Activity ({comments.length})
        </h4>
      </div>

      {/* Existing Comments */}
      <div className="flex flex-col gap-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="flex items-start gap-3 rounded-xl bg-muted/30 p-3 border border-border/50"
          >
            <Avatar className="h-7 w-7 border border-border shrink-0 mt-0.5">
              <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
              <AvatarFallback className="text-[10px]">
                {comment.author.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {comment.author.name}
                  </span>
                  {comment.author.designation && (
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      • {comment.author.designation}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {comment.createdAt}
                </span>
              </div>

              <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {comment.content}
              </p>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground italic">
            No comments yet. Start the conversation with your team.
          </div>
        )}
      </div>

      {/* New Comment Input */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-2 border-t border-border/40">
        <div className="flex items-start gap-2.5">
          <Avatar className="h-7 w-7 border border-border shrink-0 mt-1">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback className="text-[10px]">
              {currentUser.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <Textarea
            placeholder="Write a reply or update (supports @mentions)..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="text-xs bg-background resize-none min-h-[60px]"
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim()}
            className="h-7 text-xs gap-1.5 px-3"
          >
            <Send className="h-3 w-3" />
            <span>Send Comment</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
