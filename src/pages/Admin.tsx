import React from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { useAdmin } from '@/hooks/useAdmin';
import { Navigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <AdminDashboard />;
};

export default AdminPage; 