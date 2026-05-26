export const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.32, ease: [0.23, 1, 0.32, 1] as const },
  },
}

