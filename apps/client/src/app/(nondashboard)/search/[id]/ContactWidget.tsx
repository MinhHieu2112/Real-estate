import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGetAuthUserQuery, useGetOrCreateConversationMutation, useGetPropertyQuery } from '@/state/api';
import { FileText, Loader2, MessageCircle, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChatConversation } from '@shared/types';
import ConversationView from '@/components/widgets/ConversationView';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const ContactWidget = ({ onOpenModal, propertyId }: ContactWidgetProps) => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: property } = useGetPropertyQuery(propertyId!, { skip: !propertyId });
  const [createConversation, { isLoading: isCreatingConv }] = useGetOrCreateConversationMutation();
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const router = useRouter();

  const handleButtonClick = () => {
    if (authUser) {
      onOpenModal();
    } else {
      router.push("/signin");
    }
  };

  const handleChatClick = async () => {
    if (!authUser) {
      router.push("/signin");
      return;
    }

    const tenantCognitoId = authUser.cognitoInfo?.userId;
    const managerCognitoId = property?.managerCognitoId;

    if (!managerCognitoId || !tenantCognitoId) {
      toast.error("Không tìm thấy thông tin quản lý dự án.");
      return;
    }

    if (tenantCognitoId === managerCognitoId) {
      toast.info("Bạn là người quản lý dự án này.");
      return;
    }

    try {
      const conv = await createConversation({
        tenantCognitoId,
        managerCognitoId,
      }).unwrap();

      const fullConv = {
        ...conv,
        peer: conv.peer && conv.peer.name && conv.peer.name !== 'Người dùng'
          ? conv.peer
          : {
              cognitoId: managerCognitoId,
              name: property?.manager?.name || "Người quản lý",
              email: property?.manager?.email || "",
            },
      };

      setActiveConversation(fullConv);
      setIsChatOpen(true);
    } catch (err) {
      toast.error("Không thể kết nối cuộc trò chuyện. Vui lòng thử lại sau.");
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 h-fit min-w-[320px] shadow-sm">
        {/* Contact Property Section */}
        <div className="flex items-center gap-3.5 mb-5 border border-primary-100 bg-primary-50/50 p-4 rounded-xl transition-colors hover:border-primary-300">
          <div className="w-11 h-11 bg-primary-900 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <Phone className="text-white w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 mb-0.5 truncate">
              Liên hệ 
            </p>
            <div className="text-xs text-primary-500 tracking-tight">
              Email: {property?.manager?.email || "Chưa cập nhật"}
            </div>
            <div className="text-xs text-primary-500 tracking-tight">
              Phone: {property?.manager?.phoneNumber || "Chưa cập nhật"}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <Button 
            className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold py-2.5 rounded-xl shadow-xs transition flex items-center justify-center"
            onClick={handleButtonClick}
          >
            <FileText className="w-4 h-4 mr-2" />
            {authUser ? "Nộp đơn đăng ký" : "Đăng nhập để đăng ký"}
          </Button>

          <Button 
            variant="outline"
            className="w-full border-primary-600 text-primary-700 hover:bg-primary-50 hover:text-primary-800 font-semibold py-2.5 rounded-xl transition flex items-center justify-center"
            onClick={handleChatClick}
            disabled={isCreatingConv}
          >
            {isCreatingConv ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4 mr-2 text-primary-600" />
            )}
            Trao đổi thêm
          </Button>
        </div>

        <hr className="my-5 border-gray-100" />

        {/* Language & Availability Info */}
        <div className="text-xs text-gray-600 space-y-1.5">
          <div className="text-gray-500 leading-relaxed">
            Làm việc từ thứ 2 đến thứ 6 hàng tuần.
          </div>
        </div>
      </div>

      {/* Interactive Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-[440px] h-[560px] p-0 overflow-hidden rounded-2xl flex flex-col bg-white">
          {activeConversation && authUser?.cognitoInfo?.userId && (
            <ConversationView 
              conversation={activeConversation}
              currentUserCognitoId={authUser.cognitoInfo.userId}
              onBack={() => setIsChatOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactWidget;