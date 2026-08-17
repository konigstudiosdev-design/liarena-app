import React from "react";
import { cn } from "../../lib/utils";

// Button
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "glass" | "success" | "warning";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-white hover:opacity-90 shadow-premium active:scale-[0.98]",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover active:scale-[0.98]",
      outline: "border border-border bg-transparent hover:bg-secondary text-foreground active:scale-[0.98]",
      ghost: "hover:bg-secondary text-muted-foreground hover:text-foreground active:scale-[0.98]",
      danger: "bg-danger text-white hover:opacity-90 active:scale-[0.98]",
      glass: "glass text-foreground hover:bg-white/40 active:scale-[0.98]",
      success: "bg-success text-white hover:opacity-90 active:scale-[0.98]",
      warning: "bg-warning text-white hover:opacity-90 active:scale-[0.98]",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2",
      lg: "h-12 px-8 text-lg",
      icon: "h-10 w-10",
    };

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-2xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// Card
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-[32px] border border-border bg-card text-card-foreground shadow-sm", className)} {...props} />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-8", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-bold tracking-tight text-foreground italic", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground font-medium", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-8 pt-0", className)} {...props} />
);

// Badge
export const Badge = ({ className, variant = "primary", ...props }: any) => {
  const variants = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary text-secondary-foreground border-transparent",
    danger: "bg-danger/10 text-danger border-danger/20",
    outline: "text-foreground",
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    neutral: "bg-slate-50 text-slate-500 border-slate-100"
  };

  return (
    <div className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest", variants[variant as keyof typeof variants], className)} {...props} />
  );
};

// Tabs
export const Tabs = ({ className, children, ...props }: any) => (
  <div className={cn("flex space-x-1 bg-secondary/50 p-1.5 rounded-2xl w-fit", className)}>{children}</div>
);

export const Tab = ({ className, active, ...props }: any) => (
  <button
    className={cn(
      "px-6 py-2.5 text-xs font-bold rounded-xl transition-all",
      active ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/50",
      className
    )}
    {...props}
  />
);

// Avatar
export const Avatar = ({ src, fallback, className }: any) => (
  <div className={cn("relative flex shrink-0 overflow-hidden rounded-[24px] bg-slate-50 ring-4 ring-white shadow-sm transition-transform hover:scale-105 duration-500", className)}>
    {src ? (
      <img src={src} className="aspect-square h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground font-bold italic uppercase">
        {fallback}
      </div>
    )}
  </div>
);

// Input
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// Skeleton
export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200", className)}
      {...props}
    />
  );
};

// --- MODERN TOAST SYSTEM (NON-BLOCKING) ---
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

const notify = () => {
  toastListeners.forEach(listener => listener([...toasts]));
};

export const toast = {
  success: (message: string) => {
    const id = Math.random().toString(36).substring(7);
    toasts.push({ id, message, type: 'success' });
    notify();
    setTimeout(() => toast.dismiss(id), 5000);
  },
  error: (message: string) => {
    const id = Math.random().toString(36).substring(7);
    toasts.push({ id, message, type: 'error' });
    notify();
    setTimeout(() => toast.dismiss(id), 5000);
  },
  info: (message: string) => {
    const id = Math.random().toString(36).substring(7);
    toasts.push({ id, message, type: 'info' });
    notify();
    setTimeout(() => toast.dismiss(id), 5000);
  },
  warning: (message: string) => {
    const id = Math.random().toString(36).substring(7);
    toasts.push({ id, message, type: 'warning' });
    notify();
    setTimeout(() => toast.dismiss(id), 5000);
  },
  dismiss: (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }
};

export const Toaster = () => {
  const [activeToasts, setActiveToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    const listener = (newToasts: Toast[]) => setActiveToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {activeToasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto"
          >
            <div className={cn(
              "px-6 py-4 rounded-[24px] shadow-2xl flex items-center gap-4 border min-w-[320px] max-w-md backdrop-blur-xl bg-white/90",
              t.type === 'success' && "border-emerald-100",
              t.type === 'error' && "border-red-100",
              t.type === 'warning' && "border-amber-100",
              t.type === 'info' && "border-primary/10"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                t.type === 'success' && "bg-emerald-50 text-emerald-500",
                t.type === 'error' && "bg-red-50 text-red-500",
                t.type === 'warning' && "bg-amber-50 text-amber-500",
                t.type === 'info' && "bg-primary/5 text-primary"
              )}>
                {t.type === 'success' && <CheckCircle2 size={20} />}
                {t.type === 'error' && <AlertCircle size={20} />}
                {t.type === 'warning' && <AlertCircle size={20} />}
                {t.type === 'info' && <Info size={20} />}
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-slate-800 leading-tight uppercase italic">{t.message}</p>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="text-slate-300 hover:text-slate-900 transition-colors p-1"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
