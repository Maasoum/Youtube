import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  Bell,
  GraduationCap,
  Home,
  ReceiptText,
  UserRound,
  Compass,
} from "lucide-react";
import { brand } from "@/config/brand";
import { notificationsApi } from "@/api";
import { PanelFrame, type PanelNavGroup } from "./PanelFrame";
import { NotificationBell } from "./NotificationBell";

export function UserPanelLayout() {
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const loadUnread = () => {
      notificationsApi
        .list()
        .then((items) => {
          if (active) setUnread(items.filter((item) => !item.readAt).length);
        })
        .catch(() => {
          if (active) setUnread(0);
        });
    };
    loadUnread();
    window.addEventListener("brightpaths:notifications-changed", loadUnread);
    return () => {
      active = false;
      window.removeEventListener("brightpaths:notifications-changed", loadUnread);
    };
  }, [pathname]);

  const nav: PanelNavGroup[] = [
    {
      title: "پنل من",
      items: [
        {
          label: "دوره‌های من",
          to: "/dashboard",
          icon: GraduationCap,
          end: true,
        },
        {
          label: "سفارش‌ها و رسیدها",
          to: "/dashboard/orders",
          icon: ReceiptText,
        },
        {
          label: "اعلان‌ها",
          to: "/dashboard/notifications",
          icon: Bell,
          badge: unread,
        },
        {
          label: "پروفایل و امنیت",
          to: "/dashboard/profile",
          icon: UserRound,
        },
      ],
    },
    {
      title: "ادامه‌ی مسیر",
      items: [
        { label: "همه‌ی دوره‌ها", to: "/courses", icon: Compass },
        { label: "صفحه‌ی اصلی", to: "/", icon: Home, end: true },
      ],
    },
  ];

  return (
    <PanelFrame
      panelLabel="پنل کاربری"
      panelDescription="دوره‌ها، لایسنس‌ها و سفارش‌های شما در یک جای امن."
      nav={nav}
      homePath="/dashboard"
      headerSlot={<NotificationBell />}
      footerNote={`پشتیبانی ${brand.nameFa}، ${brand.supportHours} پاسخ‌گوی شماست.`}
    >
      <Outlet />
    </PanelFrame>
  );
}
