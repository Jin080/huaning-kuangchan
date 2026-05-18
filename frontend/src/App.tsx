import { Fragment, useEffect, useState } from 'react';

import { getCurrentLocation, NAVIGATION_EVENT } from './navigation';
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
  const [location, setLocation] = useState(getCurrentLocation());

  useEffect(() => {
    const syncLocation = () => setLocation(getCurrentLocation());

    window.addEventListener(NAVIGATION_EVENT, syncLocation);
    window.addEventListener('popstate', syncLocation);

    return () => {
      window.removeEventListener(NAVIGATION_EVENT, syncLocation);
      window.removeEventListener('popstate', syncLocation);
    };
  }, []);

  const path = window.location.pathname;
  const render = routes[path] ?? routes['/'];
  return <Fragment key={location}>{render()}</Fragment>;
}

export default App;
