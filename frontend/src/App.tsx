import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DagList from './pages/DagList';
import DagDetail from './pages/DagDetail';
import DagCreate from './pages/DagCreate';
import TaskList from './pages/TaskList';
import TaskDetail from './pages/TaskDetail';
import ActionList from './pages/ActionList';

import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dags" replace />} />
          <Route path="/dags" element={<DagList />} />
          <Route path="/dags/create" element={<DagCreate />} />
          <Route path="/dags/:dagId" element={<DagDetail />} />
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
          <Route path="/actions" element={<ActionList />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
