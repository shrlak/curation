import { AnimatePresence, motion } from "framer-motion";

export default function Toast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="toast"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 30, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 30, x: "-50%" }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          <i />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
