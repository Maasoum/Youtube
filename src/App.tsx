import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { RequireAdmin, RequireAuth } from "@/components/guards/RouteGuards";
import { HomePage } from "@/pages/HomePage";
import { CoursesPage } from "@/pages/CoursesPage";
import { CourseDetailPage } from "@/pages/CourseDetailPage";
import { HowItWorksPage } from "@/pages/HowItWorksPage";
import { AboutPage } from "@/pages/AboutPage";
import { FaqPage } from "@/pages/FaqPage";
import { BlogPage } from "@/pages/BlogPage";
import { BlogPostPage } from "@/pages/BlogPostPage";
import { ContactPage } from "@/pages/ContactPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import { RefundPolicyPage } from "@/pages/RefundPolicyPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { PaymentCallbackPage } from "@/pages/PaymentCallbackPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { UserPanelLayout } from "@/components/panel/UserPanelLayout";
import { AdminPanelLayout } from "@/components/panel/AdminPanelLayout";
import { DashboardHomePage } from "@/pages/dashboard/DashboardHomePage";
import { DashboardOrdersPage } from "@/pages/dashboard/DashboardOrdersPage";
import { DashboardOrderDetailPage } from "@/pages/dashboard/DashboardOrderDetailPage";
import { DashboardReceiptPage } from "@/pages/dashboard/DashboardReceiptPage";
import { DashboardNotificationsPage } from "@/pages/dashboard/DashboardNotificationsPage";
import { DashboardProfilePage } from "@/pages/dashboard/DashboardProfilePage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminFulfillmentPage } from "@/pages/admin/AdminFulfillmentPage";
import { AdminFulfillmentDetailPage } from "@/pages/admin/AdminFulfillmentDetailPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminOrderDetailPage } from "@/pages/admin/AdminOrderDetailPage";
import { AdminCoursesPage } from "@/pages/admin/AdminCoursesPage";
import { AdminCourseEditorPage } from "@/pages/admin/AdminCourseEditorPage";
import { AdminDiscountsPage } from "@/pages/admin/AdminDiscountsPage";
import { AdminDiscountEditorPage } from "@/pages/admin/AdminDiscountEditorPage";
import { AdminBulkDiscountPage } from "@/pages/admin/AdminBulkDiscountPage";
import { AdminDiscountUsagePage } from "@/pages/admin/AdminDiscountUsagePage";
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage";
import { AdminInboxPage } from "@/pages/admin/AdminInboxPage";
import { AdminLicensesPage } from "@/pages/admin/AdminLicensesPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminUserDetailPage } from "@/pages/admin/AdminUserDetailPage";
import { AdminBlogPage } from "@/pages/admin/AdminBlogPage";
import { AdminBlogEditorPage } from "@/pages/admin/AdminBlogEditorPage";
import { AdminFaqsPage } from "@/pages/admin/AdminFaqsPage";
import { AdminTeachersPage } from "@/pages/admin/AdminTeachersPage";
import { AdminLeadsPage } from "@/pages/admin/AdminLeadsPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminPaymentSettingsPage } from "@/pages/admin/AdminPaymentSettingsPage";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:slug" element={<CourseDetailPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="refund-policy" element={<RefundPolicyPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="payment/callback" element={<PaymentCallbackPage />} />

          <Route element={<RequireAuth />}>
            <Route path="checkout/:slug" element={<CheckoutPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<UserPanelLayout />}>
            <Route index element={<DashboardHomePage />} />
            <Route path="orders" element={<DashboardOrdersPage />} />
            <Route path="orders/:orderId" element={<DashboardOrderDetailPage />} />
            <Route
              path="orders/:orderId/receipt"
              element={<DashboardReceiptPage />}
            />
            <Route
              path="notifications"
              element={<DashboardNotificationsPage />}
            />
            <Route path="profile" element={<DashboardProfilePage />} />
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="admin" element={<AdminPanelLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="fulfillment" element={<AdminFulfillmentPage />} />
            <Route
              path="fulfillment/:orderId"
              element={<AdminFulfillmentDetailPage />}
            />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
            <Route path="courses" element={<AdminCoursesPage />} />
            <Route path="courses/new" element={<AdminCourseEditorPage />} />
            <Route
              path="courses/:courseId"
              element={<AdminCourseEditorPage />}
            />
            <Route path="discounts" element={<AdminDiscountsPage />} />
            <Route path="discounts/new" element={<AdminDiscountEditorPage />} />
            <Route path="discounts/bulk" element={<AdminBulkDiscountPage />} />
            <Route
              path="discounts/:code"
              element={<AdminDiscountEditorPage />}
            />
            <Route
              path="discounts/:code/usage"
              element={<AdminDiscountUsagePage />}
            />
            <Route path="licenses" element={<AdminLicensesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:userId" element={<AdminUserDetailPage />} />
            <Route path="blog" element={<AdminBlogPage />} />
            <Route path="blog/new" element={<AdminBlogEditorPage />} />
            <Route path="blog/:postId" element={<AdminBlogEditorPage />} />
            <Route path="faqs" element={<AdminFaqsPage />} />
            <Route path="teachers" element={<AdminTeachersPage />} />
            <Route path="leads" element={<AdminLeadsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route
              path="settings/payment"
              element={<AdminPaymentSettingsPage />}
            />
            <Route path="audit" element={<AdminAuditPage />} />
            <Route path="inbox" element={<AdminInboxPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
