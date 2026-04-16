'use client';
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

const STEPS = [
  {
    id: 1,
    title: 'Set your location',
    description: "Tell ShopRadar where you are so we can show accurate delivery times and local prices from stores near you.",
    tip: 'Tap the location bar on the search page to set your country, state, and suburb.',
  },
  {
    id: 2,
    title: 'Search any product',
    description: "Type any product name — headphones, laptops, sneakers — and we'll scan 40+ global marketplaces in real time.",
    tip: 'Be specific! "Sony WH-1000XM5" gets better results than just "headp
