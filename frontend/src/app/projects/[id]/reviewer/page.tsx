import DetailView from './DetailView';

export function generateStaticParams() {
  return [{ id: '0' }];
}

export default function Page() {
  return <DetailView />;
}
