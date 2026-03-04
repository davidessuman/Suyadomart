import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';

type Product = {
  id: string;
};

type Comment = {
  id: number;
  text: string;
  time: string;
  user: string;
  avatarUrl: string;
};

type CommentsModalProps = {
  isVisible: boolean;
  onClose: () => void;
  product: Product | null;
  showAlert: (title: string, message: string, buttons?: any[]) => void;
  theme: any;  getCurrentUserId: () => Promise<string | null>;
};

const CommentsModal: React.FC<CommentsModalProps> = ({
  isVisible,
  onClose,
  product,
  showAlert,
  theme, getCurrentUserId,
}) => {
  const router = useRouter();
  const requireAuth = (action: string = 'continue') => {
    showAlert('Login Required', `Please log in or sign up to ${action}.`, [
      { text: 'Maybe later', style: 'cancel' },
      { text: 'Login / Sign up', onPress: () => router.push('/auth') },
    ]);
  };

  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const productId = product?.id;
  const channelRef = useRef<any>(null);

  const fetchComments = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_comments')
        .select(`id, comment_text, created_at, user_profiles (username, avatar_url)`)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const formatted = (data || []).map((c: any) => ({
        id: c.id,
        text: c.comment_text,
        time: formatDistanceToNow(new Date(c.created_at), { addSuffix: true }),
        user: c.user_profiles?.username || 'Anonymous',
        avatarUrl: c.user_profiles?.avatar_url
          ? c.user_profiles.avatar_url.startsWith('http')
            ? c.user_profiles.avatar_url
            : `${SUPABASE_URL}/storage/v1/object/public/avatars/${c.user_profiles.avatar_url}`
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user_profiles?.full_name || 'User')}&background=FF9900&color=fff`,
      }));
      setComments(formatted);
    } catch (err) {
      console.error('Fetch comments error:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!isVisible || !productId) return;
    fetchComments();
    const channel = supabase
      .channel(`product-comments:${productId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'product_comments', filter: `product_id=eq.${productId}` },
        async (payload: any) => {
          const newComment = payload.new;

          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('username, avatar_url')
            .eq('id', newComment.user_id)
            .maybeSingle();

          const profile = profileData || {};
          const formatted: Comment = {
            id: newComment.id,
            text: newComment.comment_text,
            time: 'just now',
            user: profile.username || 'Anonymous',
            avatarUrl: profile.avatar_url
              ? profile.avatar_url.startsWith('http')
                ? profile.avatar_url
                : `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_url}`
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'User')}&background=FF9900&color=fff`,
          };
          setComments((prev) => [formatted, ...prev]);
        },
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [isVisible, productId, fetchComments]);

  const handleSubmitComment = async () => {
    if (!comment.trim() || !productId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        requireAuth('comment');
        return;
      }
      const { error } = await supabase
        .from('product_comments')
        .insert({ product_id: productId, user_id: userId, comment_text: comment.trim() });
      if (error) throw error;
      setComment('');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={[styles.commentsCenteredView, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.commentsModalView, { backgroundColor: theme.modalBackground }]}>
          <View style={[styles.commentsHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.commentsTitle, { color: theme.text }]}>Comments ({comments.length})</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={[styles.commentsCommentContainer, { borderBottomColor: theme.border }]}>
                  <Image source={{ uri: item.avatarUrl }} style={[styles.commentsCommentAvatar, { borderColor: theme.primary }]} />
                  <View style={styles.commentsCommentContent}>
                    <Text style={[styles.commentsCommentUser, { color: theme.text }]}>
                      {item.user}
                      <Text style={[styles.commentsCommentTime, { color: theme.textTertiary }]}> • {item.time}</Text>
                    </Text>
                    <Text style={[styles.commentsCommentText, { color: theme.textSecondary }]}>{item.text}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={[styles.commentsEmptyText, { color: theme.textTertiary }]}>Be the first to comment!</Text>
              }
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          )}
          <View style={[styles.commentsInputContainer, { borderTopColor: theme.border, backgroundColor: theme.modalBackground }]}>
            <TextInput
              style={[
                styles.commentsInput,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Add a comment..."
              placeholderTextColor={theme.textTertiary}
              value={comment}
              onChangeText={setComment}
              multiline
              onSubmitEditing={handleSubmitComment}
            />
            <TouchableOpacity
              onPress={handleSubmitComment}
              disabled={isSubmitting || !comment.trim()}
              style={[
                styles.commentsSubmitButton,
                { backgroundColor: theme.primary },
                (!comment.trim() || isSubmitting) && { opacity: 0.5 },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="send" size={22} color="#000" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CommentsModal;

const styles = StyleSheet.create({
  commentsCenteredView: { flex: 1, justifyContent: 'flex-end' },

  commentsModalView: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },

  commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, marginTop: 10 },

  commentsTitle: { fontSize: 18, fontWeight: 'bold' },

  commentsCommentContainer: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1 },

  commentsCommentAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 12, borderWidth: 1.5 },

  commentsCommentContent: { flex: 1 },

  commentsCommentUser: { fontWeight: 'bold', fontSize: 14.5 },

  commentsCommentTime: { fontSize: 12 },

  commentsCommentText: { fontSize: 15, marginTop: 2, lineHeight: 20 },

  commentsEmptyText: { textAlign: 'center', marginTop: 30, fontSize: 16 },

  commentsInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: 1 },

  commentsInput: { flex: 1, borderRadius: 25, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16, maxHeight: 100 },

  commentsSubmitButton: { marginLeft: 10, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  // Seller Profile Modal
});
