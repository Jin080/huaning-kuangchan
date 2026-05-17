import {
  AccountHome,
  MyBidsPage,
  MyCertificationPage,
  MyDepositsPage,
  MyMessagesPage,
} from './pages/AccountPages';
import {
  AdminDashboard,
  BidManagementPage,
  BlacklistManagementPage,
  ContentManagementPage,
  ContractManagementPage,
  DepositReviewPage,
  EnterpriseReviewPage,
  FileManagementPage,
  LotEditPage,
  LotManagementPage,
  LotReviewPage,
  NotificationManagementPage,
  OperationLogPage,
  RefundManagementPage,
  ResultManagementPage,
} from './pages/AdminPages';
import {
  AuctionDetail,
  DisclosurePage,
  EnterpriseRegisterPage,
  LiveAuctionList,
  LoginPage,
  NewsDetail,
  NewsList,
  PortalHome,
  ResultDetail,
  ResultList,
  UpcomingDetail,
  UpcomingList,
} from './pages/PortalPages';

const routes: Record<string, () => React.ReactNode> = {
  '/': () => <PortalHome />,
  '/announcements/upcoming': () => <UpcomingList />,
  '/announcements/upcoming/detail': () => <UpcomingDetail />,
  '/auctions/live': () => <LiveAuctionList />,
  '/auctions/live/detail': () => <AuctionDetail />,
  '/results': () => <ResultList />,
  '/results/detail': () => <ResultDetail />,
  '/news': () => <NewsList />,
  '/news/detail': () => <NewsDetail />,
  '/disclosures': () => <DisclosurePage />,
  '/login': () => <LoginPage />,
  '/enterprise/register': () => <EnterpriseRegisterPage />,
  '/admin/dashboard': () => <AdminDashboard />,
  '/admin/lots': () => <LotManagementPage />,
  '/admin/lots/edit': () => <LotEditPage />,
  '/admin/reviews/lots': () => <LotReviewPage />,
  '/admin/reviews/enterprises': () => <EnterpriseReviewPage />,
  '/admin/reviews/deposits': () => <DepositReviewPage />,
  '/admin/bids': () => <BidManagementPage />,
  '/admin/results': () => <ResultManagementPage />,
  '/admin/contracts': () => <ContractManagementPage />,
  '/admin/refunds': () => <RefundManagementPage />,
  '/admin/blacklist': () => <BlacklistManagementPage />,
  '/admin/content': () => <ContentManagementPage />,
  '/admin/notifications': () => <NotificationManagementPage />,
  '/admin/files': () => <FileManagementPage />,
  '/admin/logs': () => <OperationLogPage />,
  '/account': () => <AccountHome />,
  '/account/certification': () => <MyCertificationPage />,
  '/account/deposits': () => <MyDepositsPage />,
  '/account/bids': () => <MyBidsPage />,
  '/account/messages': () => <MyMessagesPage />,
};

function App() {
  const path = window.location.pathname;
  const render = routes[path] ?? routes['/'];
  return render();
}

export default App;
