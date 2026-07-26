import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function InputField({
  label,
  icon,
  inline = false,
  value,
  onChange,
  readOnly = false,
  type = "text",
  error = null,
  className,
  trailingIcon,
  as = "input",
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState("");

  // Update localValue when value from props changes
  useEffect(() => {
    if (type !== "currency") return;

    if (!isFocused) {
      if (value === undefined || value === null || value === "") {
        setLocalValue("");
      } else {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          // Format with US locale for commas as thousands separator and dot for decimals
          setLocalValue(
            num.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          );
        } else {
          setLocalValue(value);
        }
      }
    } else {
      if (value === undefined || value === null || value === "") {
        setLocalValue("");
      } else {
        // Keep as string without formatting (no commas) when editing
        const valStr = value.toString();
        // If it equals 0, let the user clear it easily
        if (valStr === "0" || valStr === "0.00") {
          setLocalValue("");
        } else {
          setLocalValue(valStr);
        }
      }
    }
  }, [value, isFocused, type]);

  const handleFocus = (e) => {
    setIsFocused(true);
    // Select text on focus for better usability
    setTimeout(() => {
      e.target.select();
    }, 50);
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (props.onBlur) props.onBlur(e);
  };

  const handleInputChange = (e) => {
    let val = e.target.value;

    // Allow empty value, single minus sign, single dot, or minus and dot
    if (val === "" || val === "-" || val === "." || val === "-.") {
      setLocalValue(val);
      const mockEvent = {
        ...e,
        target: {
          ...e.target,
          name: props.name,
          value: val
        }
      };
      if (onChange) onChange(mockEvent);
      return;
    }

    // Regular expression to allow digits with up to 2 decimal places only
    const regex = /^-?\d*\.?\d{0,2}$/;
    if (regex.test(val)) {
      setLocalValue(val);
      const mockEvent = {
        ...e,
        target: {
          ...e.target,
          name: props.name,
          value: val
        }
      };
      if (onChange) onChange(mockEvent);
    }
  };

  return (
    <div
      className={cn(
        inline
          ? cn("flex items-center gap-2 w-full", as === "textarea" && "items-start")
          : "flex flex-col gap-1 w-full",
        className
      )}
    >
      {label && (
        <label
          className={cn(
            "text-xs font-medium text-gray-700 flex items-center gap-1",
            inline ? cn("w-22 shrink-0 mb-0", as === "textarea" && "mt-1.5") : "mb-1"
          )}
        >
          {icon && <span className="flex items-center">{icon}</span>}
          {label}
        </label>
      )}

      {/* INPUT / TEXTAREA + ICONO */}
      <div className="relative w-full">
        {as === "textarea" ? (
          <textarea
            value={value || ""}
            onChange={onChange}
            readOnly={readOnly}
            className={cn(
              "flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[50px] leading-normal",
              readOnly && "bg-gray-100 cursor-not-allowed",
              error && "border-red-500 bg-red-50 focus-visible:ring-red-500 focus:bg-red-50"
            )}
            {...props}
          />
        ) : (
          <Input
            type={type === "currency" ? "text" : type}
            value={type === "currency" ? localValue : (value || "")}
            onChange={type === "currency" ? handleInputChange : onChange}
            readOnly={readOnly}
            onFocus={type === "currency" ? handleFocus : (e) => {
              if (type === "number") e.target.select();
              if (props.onFocus) props.onFocus(e);
            }}
            onBlur={type === "currency" ? handleBlur : props.onBlur}
            className={cn(
              "h-6 px-2 text-xs leading-tight", // 🔥 altura compacta real
              trailingIcon && "pr-8",
              readOnly && "bg-gray-100 cursor-not-allowed",
              error && "border-red-500 bg-red-50 focus-visible:ring-red-500 focus:bg-red-50",
              type === "currency" && "text-right" // Align currency text to the right for a clean layout
            )}
            {...props}
          />
        )}

        {trailingIcon && as !== "textarea" && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            {trailingIcon}
          </div>
        )}
      </div>

      {!inline && error && (
        <p className="text-red-500 text-xs">{error}</p>
      )}
    </div>
  );
}

