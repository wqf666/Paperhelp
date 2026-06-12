import ProjectDashboard from './ProjectDashboard';

export function generateStaticParams() {
  return [{ id: '0' }];
}

export default function Page() {
  return <ProjectDashboard />;
}
