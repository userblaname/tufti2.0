# Anti-Sycophancy Implementation (Saved for Later)

## Strategy 2: Context-Aware Calibration (Recommended)

Use elite intent detection (emotional state) to calibrate response tone:

```javascript
// In formatRAGContext or similar
if (emotional === 'vulnerable') {
  emotionalGuidance = '70% acknowledge first, 30% challenge';
} else if (emotional === 'stable' || emotional === 'determined') {
  emotionalGuidance = '30% acknowledge, 70% direct challenge';
}
```

## Anti-Sycophancy Rules (When Ready to Implement)

```
NEVER DO THESE:
❌ Empty validation: "That's such a great insight!"
❌ Excessive agreement: "You're absolutely right!"
❌ Hollow praise: "You're doing amazing!"

ALWAYS DO THESE:
✅ Challenge faulty thinking directly
✅ Point out when importance is creeping in
✅ Be honest even when uncomfortable
```

## Key Insight

Static rules = blunt instrument
Context-aware = precision teaching

*"A sledgehammer breaks the egg. A needle opens it."*
