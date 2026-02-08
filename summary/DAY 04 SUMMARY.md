# MindMosaic Day 04: Layout Foundation

## 📅 Date: January 31, 2026

---

## 🎯 Objective

Create the AppShell pattern with Header, Footer, and Sidebar components for consistent layout composition.

---

## ✅ What Was Accomplished

### AppShell Component

Created a flexible layout wrapper with slots:

```typescript
interface AppShellProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}
```

**Layout Structure:**

```
┌─────────────────────────────────────┐
│              Header                 │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │        Main Content      │
│          │                          │
│          │                          │
├──────────┴──────────────────────────┤
│              Footer                 │
└─────────────────────────────────────┘
```

### Header Component

```typescript
interface HeaderProps {
  logo?: React.ReactNode;
  navigation?: React.ReactNode;
  actions?: React.ReactNode;
}
```

**Features:**

- Fixed height (64px)
- Brand background
- Responsive navigation slots
- Action buttons area

### Footer Component

```typescript
interface FooterProps {
  className?: string;
}
```

**Features:**

- Copyright text
- Brand-compliant styling
- Responsive layout

### Sidebar Component

```typescript
interface SidebarProps {
  navigation: React.ReactNode;
  collapsed?: boolean;
}
```

**Features:**

- Fixed width (256px)
- Collapsible (planned)
- Navigation slot
- Brand background

---

## 📁 Files Created

```
src/shared/ui/
├── AppShell.tsx
├── Header.tsx
├── Footer.tsx
└── Sidebar.tsx
```

---

## 🏗️ Layout Composition

### Public Layout (No Sidebar)

```jsx
<AppShell header={<Header />} footer={<Footer />}>
  <Outlet />
</AppShell>
```

### Dashboard Layout (With Sidebar)

```jsx
<AppShell
  header={<Header />}
  sidebar={<Sidebar navigation={navItems} />}
  footer={<Footer />}
>
  <Outlet />
</AppShell>
```

---

## 🎨 Layout Configurations

| Layout        | Header | Sidebar | Footer |
| ------------- | ------ | ------- | ------ |
| PublicLayout  | ✅     | ❌      | ✅     |
| AuthLayout    | ✅     | ❌      | ❌     |
| StudentLayout | ✅     | ✅      | ✅     |
| ParentLayout  | ✅     | ✅      | ✅     |
| AdminLayout   | ✅     | ✅      | ✅     |

---

## 📐 Dimensions

| Component    | Dimension | Value           |
| ------------ | --------- | --------------- |
| Header       | Height    | 64px            |
| Sidebar      | Width     | 256px           |
| Footer       | Height    | auto (min 48px) |
| Main Content | Width     | flex-1          |

---

## 🔍 Verification

```bash
npm run dev

# Navigate to different sections:
# - / (no sidebar)
# - /student (with sidebar)
# - /admin (with sidebar)
```

---

## 📋 Day 4 Checklist

- [x] AppShell component created with slots
- [x] Header component with navigation slots
- [x] Footer component with brand styling
- [x] Sidebar component with navigation slot
- [x] All layouts updated to use AppShell
- [x] Responsive considerations in place

---

## 🏗️ Architecture Decisions

| Decision            | Rationale                     |
| ------------------- | ----------------------------- |
| AppShell pattern    | Consistent layout composition |
| Slot-based design   | Maximum flexibility           |
| CSS Grid for layout | Modern, responsive approach   |
| Fixed dimensions    | Predictable UI                |

---

## 🚀 Next Steps (Day 5)

1. Create AuthGuard placeholder
2. Create RoleGuard placeholder
3. Update protected layouts with guards
4. Define role constants

---

_Document generated: January 31, 2026_
_MindMosaic v0.1.0 - Day 4_
