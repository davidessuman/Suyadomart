import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  StyleSheet,
  FlatList,
  Modal,
  Dimensions,
  Platform,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

const PRIMARY_COLOR = '#FF9900';
const LIGHT_BACKGROUND = '#FFFFFF';
const DARK_BACKGROUND = '#121212';
const LIGHT_TEXT = '#121212';
const DARK_TEXT = '#FFFFFF';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  review_text: string;
  user_display_name: string;
  user_avatar_url: string | null;
  created_at: string;
  helpful_count: number;
}

interface ProductReviewsSectionProps {
  productId: string;
  currentUserId: string | null;
  theme: any;
  showAlert?: (title: string, message: string, buttons?: any[]) => void;
}

const StarRating: React.FC<{
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  size?: number;
  color?: string;
}> = ({ rating, onRatingChange, interactive = false, size = 18, color = PRIMARY_COLOR }) => {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          disabled={!interactive}
          onPress={() => onRatingChange?.(star)}
        >
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? color : '#ccc'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const ReviewCard: React.FC<{ review: Review; theme: any }> = ({ review, theme }) => {
  const dateObj = new Date(review.created_at);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View
      style={[
        styles.reviewCard,
        {
          backgroundColor: theme.card || '#f8f8f8',
          borderColor: theme.border || '#e0e0e0',
        },
      ]}
    >
      {/* User Info and Rating */}
      <View style={styles.reviewHeader}>
        <View style={styles.userInfo}>
          {review.user_avatar_url ? (
            <Image
              source={{ uri: review.user_avatar_url }}
              style={styles.userAvatar}
            />
          ) : (
            <View
              style={[
                styles.userAvatar,
                { backgroundColor: PRIMARY_COLOR, justifyContent: 'center', alignItems: 'center' },
              ]}
            >
              <Ionicons name="person" size={16} color="#fff" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.userName,
                { color: theme.text || LIGHT_TEXT },
              ]}
            >
              {review.user_display_name}
            </Text>
            <Text style={[styles.reviewDate, { color: theme.textSecondary || '#999' }]}>
              {formattedDate}
            </Text>
          </View>
        </View>
        <StarRating rating={review.rating} size={16} />
      </View>

      {/* Review Text */}
      <Text
        style={[
          styles.reviewText,
          { color: theme.text || LIGHT_TEXT },
        ]}
      >
        {review.review_text}
      </Text>

      {/* Helpful Button */}
      {review.helpful_count > 0 && (
        <View style={styles.helpfulSection}>
          <Ionicons name="thumbs-up-outline" size={14} color={PRIMARY_COLOR} />
          <Text style={[styles.helpfulCount, { color: theme.textSecondary || '#999' }]}>
            {review.helpful_count} found this helpful
          </Text>
        </View>
      )}
    </View>
  );
};

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  productId,
  currentUserId,
  theme,
  showAlert: propShowAlert,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use provided showAlert or fallback to native Alert
  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (propShowAlert) {
      propShowAlert(title, message, buttons);
    } else {
      // Fallback to native Alert if no showAlert provided
      if (buttons && buttons.length > 0) {
        Alert.alert(title, message, buttons);
      } else {
        Alert.alert(title, message);
      }
    }
  };

  // Fetch reviews
  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allReviews = data || [];
      setReviews(allReviews);

      // Calculate average rating
      if (allReviews.length > 0) {
        const avgRating =
          allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        setAverageRating(avgRating);
      }

      // Find user's review if they're logged in
      if (currentUserId) {
        const userRev = allReviews.find((r) => r.user_id === currentUserId);
        if (userRev) {
          setUserReview(userRev);
          setFormRating(userRev.rating);
          setFormText(userRev.review_text);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!currentUserId) {
      showAlert('Login Required', 'Please log in to leave a review');
      return;
    }

    if (formText.trim().length < 10) {
      showAlert('Review Too Short', 'Review must be at least 10 characters long');
      return;
    }

    try {
      setSubmitting(true);

      // Get user info
      const { data: userData } = await supabase.auth.getUser();
      const userProfile = await supabase
        .from('user_profiles')
        .select('username, avatar_url')
        .eq('id', currentUserId)
        .single();

      const displayName =
        userProfile.data?.username ||
        userData?.user?.email?.split('@')[0] ||
        'Anonymous';
      const avatarUrl = userProfile.data?.avatar_url || null;

      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from('product_reviews')
          .update({
            rating: formRating,
            review_text: formText,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userReview.id);

        if (error) throw error;
      } else {
        // Insert new review
        const { error } = await supabase.from('product_reviews').insert({
          product_id: productId,
          user_id: currentUserId,
          rating: formRating,
          review_text: formText,
          user_display_name: displayName,
          user_avatar_url: avatarUrl,
        });

        if (error) throw error;
      }

      // Refresh reviews
      await fetchReviews();
      setShowReviewForm(false);
      setFormText('');
      setFormRating(5);
      showAlert('Success', userReview ? 'Review updated successfully!' : 'Review posted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      showAlert('Error', 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;

    showAlert('Delete Review', 'Are you sure you want to delete your review?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            setIsDeleting(true);
            const { error } = await supabase
              .from('product_reviews')
              .delete()
              .eq('id', userReview.id);

            if (error) throw error;

            // Refresh reviews
            await fetchReviews();
            setUserReview(null);
            setFormText('');
            setFormRating(5);
            showAlert('Success', 'Review deleted successfully!');
          } catch (error) {
            console.error('Error deleting review:', error);
            showAlert('Error', 'Failed to delete review');
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const otherReviews = reviews.filter((r) => r.user_id !== currentUserId);

  return (
    <View style={styles.container}>
      {/* Reviews Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text || LIGHT_TEXT }]}>
          Reviews & Ratings
        </Text>
        {reviews.length > 0 && (
          <View style={styles.ratingBox}>
            <Text style={[styles.ratingNumber, { color: PRIMARY_COLOR }]}>
              {averageRating.toFixed(1)}
            </Text>
            <View style={{ marginLeft: 8 }}>
              <StarRating rating={Math.round(averageRating)} size={16} />
              <Text
                style={[
                  styles.ratingCount,
                  { color: theme.textSecondary || '#999' },
                ]}
              >
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* User's Review (if exists) */}
      {userReview && !showReviewForm && (
        <View
          style={[
            styles.userReviewBox,
            {
              backgroundColor: isDark ? '#1e1e1e' : '#fff8e1',
              borderColor: PRIMARY_COLOR,
            },
          ]}
        >
          <View style={styles.userReviewHeader}>
            <Text style={[styles.userReviewTitle, { color: PRIMARY_COLOR }]}>
              Your Review
            </Text>
            <View style={styles.userReviewActions}>
              <TouchableOpacity onPress={() => setShowReviewForm(true)}>
                <Ionicons name="pencil" size={18} color={PRIMARY_COLOR} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteReview} disabled={isDeleting}>
                <Ionicons
                  name="trash"
                  size={18}
                  color={isDeleting ? '#ccc' : '#FF3B30'}
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            <StarRating rating={userReview.rating} size={16} />
            <Text
              style={[
                styles.reviewText,
                { color: theme.text || LIGHT_TEXT, marginTop: 8 },
              ]}
            >
              {userReview.review_text}
            </Text>
          </View>
        </View>
      )}

      {/* Review Form Modal */}
      {showReviewForm && (
        <View
          style={[
            styles.reviewForm,
            {
              backgroundColor: theme.card || '#f8f8f8',
              borderColor: theme.border || '#e0e0e0',
            },
          ]}
        >
          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { color: theme.text || LIGHT_TEXT }]}>
              {userReview ? 'Edit Your Review' : 'Write a Review'}
            </Text>
            <TouchableOpacity onPress={() => setShowReviewForm(false)}>
              <Ionicons name="close" size={24} color={theme.text || LIGHT_TEXT} />
            </TouchableOpacity>
          </View>

          {/* Rating Selector */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: theme.text || LIGHT_TEXT }]}>
              Rating
            </Text>
            <StarRating
              rating={formRating}
              onRatingChange={setFormRating}
              interactive
              size={32}
            />
          </View>

          {/* Review Text Input */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: theme.text || LIGHT_TEXT }]}>
              Your Review (at least 10 characters)
            </Text>
            <TextInput
              style={[
                styles.reviewInput,
                {
                  backgroundColor: isDark ? '#252525' : '#fff',
                  borderColor: theme.border || '#ddd',
                  color: theme.text || LIGHT_TEXT,
                },
              ]}
              placeholder="Share your experience with this product..."
              placeholderTextColor={theme.textSecondary || '#999'}
              value={formText}
              onChangeText={setFormText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text
              style={[
                styles.charCount,
                { color: formText.length >= 10 ? PRIMARY_COLOR : '#999' },
              ]}
            >
              {formText.length}/500
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: PRIMARY_COLOR }]}
              onPress={() => {
                setShowReviewForm(false);
                // Reset form to user's existing review if editing, or clear if new
                if (userReview) {
                  setFormText(userReview.review_text);
                  setFormRating(userReview.rating);
                } else {
                  setFormText('');
                  setFormRating(5);
                }
              }}
            >
              <Text style={[styles.cancelButtonText, { color: PRIMARY_COLOR }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: PRIMARY_COLOR,
                  opacity: formText.length >= 10 && !submitting ? 1 : 0.6,
                },
              ]}
              disabled={formText.length < 10 || submitting}
              onPress={handleSubmitReview}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {userReview ? 'Update Review' : 'Post Review'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add/Edit Review Button */}
      {!showReviewForm && currentUserId && !userReview && (
        <TouchableOpacity
          style={[styles.addReviewButton, { backgroundColor: PRIMARY_COLOR }]}
          onPress={() => setShowReviewForm(true)}
        >
          <Ionicons name="star-outline" size={18} color="#fff" />
          <Text style={styles.addReviewButtonText}>Write a Review</Text>
        </TouchableOpacity>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      )}

      {/* Reviews List */}
      {!loading && (
        <>
          {otherReviews.length === 0 && reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={48} color={PRIMARY_COLOR} />
              <Text style={[styles.emptyStateText, { color: theme.text || LIGHT_TEXT }]}>
                No reviews yet
              </Text>
              <Text
                style={[
                  styles.emptyStateSubtext,
                  { color: theme.textSecondary || '#999' },
                ]}
              >
                Be the first to review this product
              </Text>
            </View>
          ) : (
            <FlatList
              data={otherReviews}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ReviewCard review={item} theme={theme} />}
              scrollEnabled={false}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: theme.border || '#e0e0e0', marginVertical: 12 }} />
              )}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR,
  },
  ratingNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  ratingCount: {
    fontSize: 12,
    marginTop: 2,
  },
  userReviewBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  userReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userReviewActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  userReviewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  helpfulSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  helpfulCount: {
    fontSize: 12,
  },
  reviewForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 120,
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  addReviewButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addReviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  centerContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
});
