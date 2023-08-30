import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "./ui/use-toast";

export function SubmittableInput({
    onSubmit,
    label,
    placeholder,
    disabled,
}: {
    onSubmit: (text: string) => void;
    label: string;
    placeholder: string;
    disabled?: boolean;
}) {
    return (
        <form
            className="flex flex-row items-center gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                const textEl = e.currentTarget.elements.namedItem(
                    "text"
                ) as HTMLInputElement;
                if (!textEl.value) {
                    toast({
                        title: "Couldn't submit",
                        description: "Please enter a value",
                    });
                } else {
                    onSubmit(textEl.value);
                    textEl.value = "";
                }
            }}
        >
            <Input
                className="-ml-3 -my-2 flex-grow flex-3 text-base"
                name="text"
                placeholder={placeholder}
                autoComplete="off"
                disabled={disabled}
            />
            <Button
                asChild
                type="submit"
                className="flex-shrink flex-1 cursor-pointer"
            >
                <Input type="submit" value={label} disabled={disabled} />
            </Button>
        </form>
    );
}
