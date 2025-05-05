import { memo } from 'react'
import { motion } from 'framer-motion'
import { Copy, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Message } from '@/lib/types'

interface MessageProps {
  messa