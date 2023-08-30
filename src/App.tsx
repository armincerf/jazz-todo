import { useCallback, useEffect, useState } from "react";

import { CoMap, CoID, AccountID } from "cojson";
import {
    consumeInviteLinkFromWindowLocation,
    useJazz,
    useProfile,
    useTelepathicState,
    createInviteLink,
} from "jazz-react";

import { SubmittableInput } from "./components/SubmittableInput";
import { useToast } from "./components/ui/use-toast";
import { Skeleton } from "./components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import uniqolor from "uniqolor";
import QRCode from "qrcode";

type TaskContent = { done: boolean; text: string; deleted: boolean };
type Task = CoMap<TaskContent>;

type TodoListContent = {
    title: string;
    // other keys form a set of task IDs
    [taskId: CoID<Task>]: true;
};
type TodoList = CoMap<TodoListContent>;

export default function App() {
    const [listId, setListId] = useState<CoID<TodoList>>();

    const { localNode, logOut } = useJazz();
    const existingRooms = Object.keys(localNode.coValues);

    useEffect(() => {
        const listener = async () => {
            const acceptedInvitation = await consumeInviteLinkFromWindowLocation(
                localNode
            );

            if (acceptedInvitation) {
                setListId(acceptedInvitation.valueID as CoID<TodoList>);
                window.location.hash = acceptedInvitation.valueID;
                return;
            }

            setListId(window.location.hash.slice(1) as CoID<TodoList>);
        };
        window.addEventListener("hashchange", listener);
        listener();

        return () => {
            window.removeEventListener("hashchange", listener);
        };
    }, [localNode, listId]);

    const createList = useCallback(
        (title: string) => {
            const listGroup = localNode.createGroup();
            const list = listGroup.createMap<TodoListContent>();

            list.edit((list) => {
                list.set("title", title);
            });

            window.location.hash = list.id;
        },
        [localNode]
    );

    return (
        <div className="flex flex-col h-full items-center justify-start gap-10 pt-10 pb-10 px-5">
            {existingRooms.length > 0 && (
                <div className="flex flex-col gap-2">
                    <h2 className="text-lg">Existing Lists</h2>
                    <div className="flex flex-col gap-2">
                        {existingRooms.map((listId) => (
                            <Button
                                key={listId}
                                onClick={() => {
                                    setListId(listId as CoID<TodoList>);
                                    window.location.hash = listId;
                                }}
                            >
                                {listId}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {listId ? (
                <TodoListComponent listId={listId} />
            ) : (
                <SubmittableInput
                    onSubmit={createList}
                    label="Create New List"
                    placeholder="New list title"
                />
            )}
            <Button
                onClick={() => {
                    window.location.hash = "";
                    logOut();
                }}
                variant="outline"
            >
                Log Out
            </Button>
        </div>
    );
}

export function TodoListComponent({ listId }: { listId: CoID<TodoList> }) {
    const list = useTelepathicState(listId);

    const createTask = (text: string) => {
        if (!list) return;
        const task = list.coValue.getGroup().createMap<TaskContent>();

        task.edit((task) => {
            task.set("text", text);
            task.set("done", false);
        });

        list.edit((list) => {
            list.set(task.id, true);
        });
    };

    const [viewType, setViewType] = useState<"all" | "filtered">("all");

    return (
        <div className="max-w-full w-4xl">
            <div className="flex justify-between items-center gap-4 mb-4">
                <h1>
                    {list?.get("title") ? (
                        <>
                            {list.get("title")} <span className="text-sm">({list.id})</span>
                        </>
                    ) : (
                        <Skeleton className="mt-1 w-[200px] h-[1em] rounded-full" />
                    )}
                </h1>
                {list && <InviteButton list={list} />}
            </div>

            <div className="flex justify-between items-center gap-4 mb-4">
                <div className="flex gap-4">
                    <Button
                        variant="ghost"
                        className={
                            viewType === "all" ? "underline text-blue-400 cursor-default" : ""
                        }
                        onClick={() => setViewType("all")}
                    >
                        All
                    </Button>
                    <Button
                        variant="ghost"
                        className={
                            viewType === "filtered"
                                ? "underline text-blue-400 cursor-default"
                                : ""
                        }
                        onClick={() => setViewType("filtered")}
                    >
                        Filtered
                    </Button>
                </div>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px]">Done</TableHead>
                        <TableHead>Task</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {list &&
                        list
                            .keys()
                            .filter((key): key is CoID<Task> => key.startsWith("co_"))
                            .map((taskId) => (
                                <TaskRow key={taskId} taskId={taskId} viewType={viewType} />
                            ))}
                    <TableRow key="new">
                        <TableCell>
                            <Checkbox className="mt-1" disabled />
                        </TableCell>
                        <TableCell>
                            <SubmittableInput
                                onSubmit={(taskText) => createTask(taskText)}
                                label="Add"
                                placeholder="New task"
                                disabled={!list}
                            />
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}

function TaskRow({
    taskId,
    viewType,
}: {
    taskId: CoID<Task>;
    viewType: "filtered" | "all";
}) {
    const task = useTelepathicState(taskId);

    const deleteTask = () => {
        if (!task) return;
        task.edit((task) => {
            task.set("deleted", true);
        });
    };

    const isDone = task?.get("done");
    const isDeleted = task?.get("deleted");
    const isFiltered = viewType === "filtered";
    const text = task?.get("text");
    if (isFiltered && (!text || isDeleted)) {
        return null;
    }

    return (
        <TableRow>
            <TableCell>
                <Checkbox
                    className="mt-1"
                    checked={isDone}
                    onCheckedChange={(checked) => {
                        task?.edit((task) => {
                            task.set("done", !!checked);
                        });
                    }}
                />
            </TableCell>
            <TableCell>
                <div className="flex flex-row justify-between items-center gap-2">
                    <span
                        className={[
                            isDone ? "line-through" : "",
                            isDeleted ? "text-red-500 opacity-30" : "",
                        ].join(" ")}
                    >
                        {text || (
                            <Skeleton className="mt-1 w-[200px] h-[1em] rounded-full" />
                        )}
                    </span>
                    <div className="flex gap-2 items-center">
                        <NameBadge accountID={task?.getLastEditor("text")} />
                        <Button
                            variant="link"
                            size="icon"
                            className="text-red-500 text-xs"
                            onClick={deleteTask}
                            disabled={task?.get("deleted")}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
}

function NameBadge({ accountID }: { accountID?: AccountID }) {
    const profile = useProfile(accountID);

    const theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

    const brightColor = uniqolor(accountID || "", { lightness: 80 }).color;
    const darkColor = uniqolor(accountID || "", { lightness: 20 }).color;

    return (
        profile?.get("name") && (
            <span
                className="rounded-full py-0.5 px-2 text-xs"
                style={{
                    color: theme == "light" ? darkColor : brightColor,
                    background: theme == "light" ? brightColor : darkColor,
                }}
            >
                {profile.get("name")}
            </span>
        )
    );
}

function InviteButton({ list }: { list: TodoList }) {
    const [existingInviteLink, setExistingInviteLink] = useState<string>();
    const { toast } = useToast();

    return (
        list.coValue.getGroup().myRole() === "admin" && (
            <Button
                size="sm"
                className="py-0"
                disabled={!list}
                variant="outline"
                onClick={async () => {
                    let inviteLink = existingInviteLink;
                    if (list && !inviteLink) {
                        inviteLink = createInviteLink(list, "writer");
                        setExistingInviteLink(inviteLink);
                    }
                    if (inviteLink) {
                        const qr = await QRCode.toDataURL(inviteLink, {
                            errorCorrectionLevel: "L",
                        });
                        navigator.clipboard.writeText(inviteLink).then(() =>
                            toast({
                                title: "Copied invite link to clipboard!",
                                description: <img src={qr} className="w-20 h-20" />,
                            })
                        );
                    }
                }}
            >
                Invite
            </Button>
        )
    );
}
