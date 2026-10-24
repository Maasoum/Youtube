import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  HelpCircle,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ListOrdered,
  Percent,
  ScrollText,
  Settings,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { adminApi } from "@/api";
import { PanelFrame, type PanelNavGroup } from "./PanelFrame";

export function AdminPanelLayout() {
  const { pathname } = useLocation();
  const [queueCount, setQueueCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    let active = true;
    adminApi
      .getStats()
      .then((stats) => {
        if (!active) return;
        setQueueCount(stats.pendingLicenses + stats.overdueFulfillments);
        setMessageCount(stats.newMessages);
      })
      .catch(() => {
        if (!active) return;
        setQueueCount(0);
        setMessageCount(0);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  const nav: PanelNavGroup[] = [
    {
      title: "مدیریت",
      items: [
        {
          label: "داشبورد",
          to: "/admin",
          icon: LayoutDashboard,
          end: true,
        },
        {
          label: "صف تحویل لایسنس",
          to: "/admin/fulfillment",
          icon: ClipboardList,
          badge: queueCount,
        },
        { label: "سفارش‌ها", to: "/admin/orders", icon: ListOrdered },
        { label: "لایسنس‌ها", to: "/admin/licenses", icon: KeyRound },
        { label: "کاربران", to: "/admin/users", icon: UsersRound },
      ],
    },
    {
      title: "محتوا",
      items: [
        { label: "دوره‌ها", to: "/admin/courses", icon: BookOpen },
        { label: "وبلاگ", to: "/admin/blog", icon: FileText },
        { label: "پرسش‌های متداول", to: "/admin/faqs", icon: HelpCircle },
        { label: "مربیان", to: "/admin/teachers", icon: GraduationCap },
        { label: "کدهای تخفیف", to: "/admin/discounts", icon: Percent },
      ],
    },
    {
      title: "ارتباطات",
      items: [
        {
          label: "پیام‌های تماس",
          to: "/admin/inbox",
          icon: Inbox,
          badge: messageCount,
        },
        { label: "لیدها", to: "/admin/leads", icon: UserPlus },
        { label: "گزارش اقدامات", to: "/admin/audit", icon: ScrollText },
      ],
    },
    {
      title: "تنظیمات",
      items: [
        {
          label: "تنظیمات عمومی",
          to: "/admin/settings",
          icon: Settings,
          end: true,
        },
        { label: "درگاه پرداخت", to: "/admin/settings/payment", icon: CreditCard },
      ],
    },
    {
      title: "سایت",
      items: [{ label: "مشاهده‌ی سایت", to: "/", icon: Home, end: true }],
    },
  ];

  return (
    <PanelFrame
      panelLabel="پنل مدیریت"
      panelDescription="صف تحویل، سفارش‌ها و تنظیمات فروش؛ همه‌ی اقدامات حساس ثبت می‌شوند."
      nav={nav}
      homePath="/admin"
      footerNote="هر اقدام حساس در گزارش اقدامات با نام شما ثبت می‌شود."
    >
      <Outlet />
    </PanelFrame>
  );
}
