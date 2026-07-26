"use client";

import ApplicationCard from '@/components/ApplicationCard';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetApplicationsQuery, useGetAuthUserQuery, useUpdateApplicationStatusMutation } from '@/state/api'
import { CircleCheckBig, Download, File, Hospital } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react'

const Applications = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const [activeTab, setActiveTab] = useState("all");
  const {
    data: applications,
    isLoading,
    isError
  } = useGetApplicationsQuery(
    {
      userId: authUser?.cognitoInfo?.userId || "",
      userType: "manager",
    },
    {
      skip: !authUser?.cognitoInfo?.userId,
    }
  );
  const [updateApplicationStatus] = useUpdateApplicationStatusMutation();

  const handleStatusChange = async (id: number, status: string) => {
      await updateApplicationStatus({id, status});
  }

  if (isLoading) return <Loading />;
  if (isError || !applications) return <div>Error fetching applications</div>;

  const filteredApplications = applications?.filter((application) => {
    if (activeTab === "all") return true;
    return application.status.toLowerCase() === activeTab;
  });

  return (
    <div className="dashboard-container">
        <Header
            title="Applications"
            subtitle="View and manage applications for your properties"
        />
        <Tabs 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full my-5"
        >
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="denied">Denied</TabsTrigger>
            </TabsList>
            {["all", "pending", "approved", "denied"].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-5 w-full">
                    {filteredApplications.filter(
                        (application) => 
                            tab === "all" || application.status.toLowerCase() === tab
                    )
                    .map((application) => (
                        <ApplicationCard
                            key={application.id}
                            application={application}
                            userType="manager"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
                                    {/* Colored Section Status */}
                                    <div
                                        className={`p-3.5 rounded-xl text-xs sm:text-sm grow w-full md:w-auto border ${
                                            application.status === "Approved"
                                            ? "bg-green-50 border-green-200 text-green-800"
                                            : application.status === "Denied"
                                            ? "bg-red-50 border-red-200 text-red-800"
                                            : "bg-amber-50 border-amber-200 text-amber-800"
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <File className="w-4 h-4 shrink-0" />
                                            <span>
                                            Application submitted on{" "}
                                            <strong>
                                            {new Date(
                                                application.applicationDate
                                            ).toLocaleDateString('vi-VN')}
                                            </strong>
                                            .
                                            </span>
                                            <CircleCheckBig className="w-4 h-4 ml-1 shrink-0" />
                                            <span className="font-semibold">
                                            {application.status === "Approved" &&
                                                "This application has been approved."}
                                            {application.status === "Denied" &&
                                                "This application has been denied."}
                                            {application.status === "Pending" &&
                                                "This application is pending review."}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Button */}
                                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                                        <Link
                                            href={`/managers/properties/${application.propertyId}`}
                                            className="bg-white border border-gray-200 text-gray-700 py-2 px-3.5 
                                                        rounded-lg text-xs font-semibold flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
                                            scroll={false}
                                        >
                                            <Hospital className="w-4 h-4 mr-1.5" />
                                            Property Details
                                        </Link>
                                        {application.status === "Approved" && (
                                            <button
                                                className="bg-white border border-gray-200 text-gray-700 py-2 px-3.5
                                                            rounded-lg text-xs font-semibold flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
                                            >
                                                <Download className="w-4 h-4 mr-1.5" />
                                                Download Agreement
                                            </button>
                                        )}
                                        {application.status === "Pending" && (
                                            <>
                                                <button
                                                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                                                    onClick={() =>
                                                    handleStatusChange(application.id, "Approved")
                                                    }
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-all shadow-sm"
                                                    onClick={() =>
                                                    handleStatusChange(application.id, "Denied")
                                                    }
                                                >
                                                    Deny
                                                </button>
                                            </>
                                        )}
                                        {application.status === "Denied" && (
                                            <button
                                            className="bg-gray-900 text-white py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center
                                            justify-center hover:bg-gray-800 transition-all shadow-sm"
                                            >
                                                Contact User
                                            </button>
                                        )}
                                    </div>
                            </div>
                        </ApplicationCard>
                    ))}
                </TabsContent>
            ))}
        </Tabs>
    </div>
  )
}

export default Applications