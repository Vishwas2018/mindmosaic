# MindMosaic Day 03: UI Primitives

## 📅 Date: January 31, 2026

---

## 🎯 Objective

Create reusable UI primitive components that use brand tokens consistently.

---

## ✅ What Was Accomplished

### Button Component

Created a versatile button with multiple variants:

```typescript
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}
```

**Variants:**

| Variant     | Background      | Text    | Use Case          |
| ----------- | --------------- | ------- | ----------------- |
| `primary`   | brand-primary   | inverse | Primary actions   |
| `secondary` | brand-secondary | inverse | Secondary actions |
| `ghost`     | transparent     | primary | Tertiary actions  |

**Sizes:**

| Size | Padding     | Font      |
| ---- | ----------- | --------- |
| `sm` | px-3 py-1.5 | text-sm   |
| `md` | px-4 py-2   | text-base |
| `lg` | px-6 py-3   | text-lg   |

### Card Component

Created a container component for content sections:

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
}
```

**Features:**

- White background (`brand-surface`)
- Border radius using brand tokens
- Box shadow for depth
- Flexible padding

### Page Component

Created a page wrapper for consistent layout:

```typescript
interface PageProps {
  title: string;
  children: React.ReactNode;
}
```

**Features:**

- Consistent page title styling
- Max-width container
- Responsive padding
- Brand-compliant typography

### SectionHeader Component

Created a section heading component:

```typescript
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}
```

---

## 📁 Files Created

```
src/shared/ui/
├── Button.tsx
├── Card.tsx
├── Page.tsx
└── SectionHeader.tsx
```

---

## 🎨 Component Showcase

### Button

```jsx
// Primary button
<Button variant="primary">Get Started</Button>

// Secondary button
<Button variant="secondary" size="lg">Learn More</Button>

// Ghost button
<Button variant="ghost" size="sm">Cancel</Button>
```

### Card

```jsx
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</Card>
```

### Page

```jsx
<Page title="Student Dashboard">
  <Card>Content here</Card>
</Page>
```

---

## 🏗️ Design Principles

| Principle                      | Implementation            |
| ------------------------------ | ------------------------- |
| Composition over configuration | Small, focused components |
| Brand consistency              | All colors from tokens    |
| Type safety                    | TypeScript interfaces     |
| Accessibility                  | Semantic HTML, ARIA ready |

---

## 🔍 Verification

```bash
# Start dev server
npm run dev

# Visit pages to see components in action
# Components render correctly with brand colors
```

---

## 📋 Day 3 Checklist

- [x] Button component with variants (primary, secondary, ghost)
- [x] Button component with sizes (sm, md, lg)
- [x] Card component created
- [x] Page wrapper component created
- [x] SectionHeader component created
- [x] All components use brand tokens

---

## 📐 Component API Reference

### Button

| Prop       | Type                                  | Default     | Description         |
| ---------- | ------------------------------------- | ----------- | ------------------- |
| `variant`  | `'primary' \| 'secondary' \| 'ghost'` | `'primary'` | Visual style        |
| `size`     | `'sm' \| 'md' \| 'lg'`                | `'md'`      | Size preset         |
| `children` | `ReactNode`                           | required    | Button content      |
| `...rest`  | `ButtonHTMLAttributes`                | —           | Native button props |

### Card

| Prop        | Type        | Default  | Description        |
| ----------- | ----------- | -------- | ------------------ |
| `children`  | `ReactNode` | required | Card content       |
| `className` | `string`    | —        | Additional classes |

### Page

| Prop       | Type        | Default  | Description  |
| ---------- | ----------- | -------- | ------------ |
| `title`    | `string`    | required | Page title   |
| `children` | `ReactNode` | required | Page content |

---

## 🚀 Next Steps (Day 4)

1. Create AppShell layout component
2. Create Header component
3. Create Footer component
4. Create Sidebar component

---

_Document generated: January 31, 2026_
_MindMosaic v0.1.0 - Day 3_
