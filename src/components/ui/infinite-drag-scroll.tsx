import {
  animate,
  cubicBezier,
  motion,
  useMotionValue,
  wrap,
} from "motion/react";
import {
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
  createContext,
} from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

//Types
type variants = "default" | "masonry" | "polaroid";

// Create Context
const GridVariantContext = createContext<variants | undefined>(undefined);

//Motion Variants
const rowVariants = {
  initial: { opacity: 0, scale: 0.3 },
  animate: () => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: Math.random() + 0.5,
      duration: 1.0,
      ease: cubicBezier(0.18, 0.71, 0.11, 1),
    },
  }),
};

export const DraggableContainer = ({
  className,
  children,
  variant,
  autoScroll = true,
  scrollSpeed = 1.0,
  disableDrag = false,
}: {
  className?: string;
  children: React.ReactNode;
  variant?: variants;
  autoScroll?: boolean;
  scrollSpeed?: number;
  disableDrag?: boolean;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const container = ref.current?.getBoundingClientRect();
    if (!container) return;

    const { width, height } = container;

    const xDrag = x.on("change", (latest) => {
      const wrappedX = wrap(-(width / 2), 0, latest);
      x.set(wrappedX);
    });

    const yDrag = y.on("change", (latest) => {
      const wrappedY = wrap(-(height / 2), 0, latest);
      y.set(wrappedY);
    });

    // Only add wheel listener if drag is not disabled
    const handleWheelScroll = (event: WheelEvent) => {
      if (!disableDrag && !isDragging) {
        event.preventDefault();
        animate(y, y.get() - event.deltaY * 0.5, {
          type: "tween",
          duration: 0.3,
          ease: "easeOut",
        });
      }
    };

    if (!disableDrag) {
      window.addEventListener("wheel", handleWheelScroll, { passive: false });
    }

    return () => {
      xDrag();
      yDrag();
      if (!disableDrag) {
        window.removeEventListener("wheel", handleWheelScroll);
      }
    };
  }, [x, y, isDragging, disableDrag]);

  // Continuous auto-scroll effect
  useEffect(() => {
    if (!autoScroll) return;

    let animationId: number;
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      
      const elapsed = timestamp - startTime;
      
      // Simple upward movement only - no horizontal sway
      const yMovement = -elapsed * scrollSpeed * 0.05; // Continuous upward movement
      
      y.set(yMovement);
      // Center the grid better to prevent edge cutoff
      x.set(-50);
      
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [autoScroll, scrollSpeed, x, y]);

  return (
    <GridVariantContext.Provider value={variant}>
      <div className="h-dvh overflow-hidden">
        <motion.div
          className="h-dvh overflow-hidden"
        >
          <motion.div
            className={cn(
              "grid h-fit w-fit will-change-transform",
              disableDrag ? "pointer-events-none" : "cursor-grab active:cursor-grabbing",
              "grid-cols-[repeat(2,1fr)] bg-[#141414]",
              className,
            )}
            drag={!disableDrag}
            dragMomentum={!disableDrag}
            dragTransition={!disableDrag ? {
              timeConstant: 200,
              power: 0.28,
              restDelta: 0,
              bounceStiffness: 0,
            } : undefined}
            onDragStart={() => !disableDrag && setIsDragging(true)}
            onDragEnd={() => !disableDrag && setIsDragging(false)}
            style={{ x, y }}
            ref={ref}
          >
            {children}
          </motion.div>
        </motion.div>
      </div>
    </GridVariantContext.Provider>
  );
};

export const GridItem = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const variant = useContext(GridVariantContext);

  const gridItemStyles = cva(
    "overflow-hidden hover:cursor-pointer w-full h-full will-change-transform",
    {
      variants: {
        variant: {
          default: "rounded-sm",
          masonry: "even:mt-[60%] rounded-sm ",
          polaroid:
            "border-10 border-b-28 border-white shadow-xl even:rotate-3 odd:-rotate-2 hover:rotate-0 transition-transform ease-out duration-300 even:mt-[60%]",
        },
      },
      defaultVariants: {
        variant: "default",
      },
    },
  );

  return (
    <motion.div
      className={cn(gridItemStyles({ variant, className }))}
      variants={rowVariants}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
};

export const GridBody = memo(
  ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => {
    const variant = useContext(GridVariantContext);

    const gridBodyStyles = cva("grid grid-cols-[repeat(6,1fr)] h-fit w-fit", {
      variants: {
        variant: {
          default: "gap-14 p-7 md:gap-28 md:p-14",
          masonry: "gap-x-14 px-7 md:gap-x-28 md:px-14",
          polaroid: "gap-x-14 px-7 md:gap-x-28 md:px-14",
        },
      },
      defaultVariants: {
        variant: "default",
      },
    });

    return (
      <>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className={cn(gridBodyStyles({ variant, className }))}
          >
            {children}
          </div>
        ))}
      </>
    );
  },
);

GridBody.displayName = "GridBody"; 