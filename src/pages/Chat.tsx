import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { PageContent } from '@/components/PageContent';
import { ConversationList } from '@/components/ConversationList';
import { MessageThread } from '@/components/MessageThread';
import { MessageSquare } from 'lucide-react';

export default function Chat() {
  const { conversationId } = useParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(conversationId);

  return (
    <>
      <PageHeader 
        title="Chat" 
        description="Communicate with employees and send form requests"
      />
      <PageContent>
        <div className="flex h-[calc(100vh-12rem)] gap-4">
          {/* Conversation List - Left Panel */}
          <div className={`${selectedConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-border`}>
            <ConversationList 
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
            />
          </div>

          {/* Message Thread - Right Panel */}
          <div className={`${selectedConversationId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
            {selectedConversationId ? (
              <MessageThread 
                conversationId={selectedConversationId}
                onBack={() => setSelectedConversationId(undefined)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Select a conversation</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Choose a conversation from the list to start chatting
                </p>
              </div>
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}
