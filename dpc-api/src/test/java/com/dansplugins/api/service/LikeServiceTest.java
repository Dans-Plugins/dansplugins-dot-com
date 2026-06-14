package com.dansplugins.api.service;

import com.dansplugins.api.entity.Like;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.repository.LikeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LikeServiceTest {

    @Mock
    private LikeRepository likeRepository;

    @InjectMocks
    private LikeService likeService;

    private final User user = new User("alice");

    @Test
    void like_whenNotAlreadyLiked_savesAndReturnsCount() {
        when(likeRepository.existsByUserAndTargetTypeAndTargetId(user, "plugin", "mf")).thenReturn(false);
        when(likeRepository.countByTargetTypeAndTargetId("plugin", "mf")).thenReturn(1L);

        assertThat(likeService.like(user, "plugin", "mf")).isEqualTo(1L);
        verify(likeRepository).save(any(Like.class));
    }

    @Test
    void like_whenAlreadyLiked_isIdempotent() {
        when(likeRepository.existsByUserAndTargetTypeAndTargetId(user, "plugin", "mf")).thenReturn(true);
        when(likeRepository.countByTargetTypeAndTargetId("plugin", "mf")).thenReturn(3L);

        assertThat(likeService.like(user, "plugin", "mf")).isEqualTo(3L);
        verify(likeRepository, never()).save(any(Like.class));
    }

    @Test
    void like_invalidType_throws() {
        assertThatThrownBy(() -> likeService.like(user, "bogus", "mf"))
                .isInstanceOf(IllegalArgumentException.class);
        verify(likeRepository, never()).save(any());
    }

    @Test
    void like_blankTargetId_throws() {
        assertThatThrownBy(() -> likeService.like(user, "plugin", "  "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void unlike_deletesAndReturnsCount() {
        when(likeRepository.countByTargetTypeAndTargetId("guide", "mf")).thenReturn(0L);

        assertThat(likeService.unlike(user, "guide", "mf")).isEqualTo(0L);
        verify(likeRepository).deleteByUserAndTargetTypeAndTargetId(user, "guide", "mf");
    }

    @Test
    void countsForType_mapsProjectionsToTargetIdCount() {
        LikeRepository.TargetCount a = mock(LikeRepository.TargetCount.class, "a");
        when(a.getTargetId()).thenReturn("mf");
        when(a.getCount()).thenReturn(5L);
        LikeRepository.TargetCount b = mock(LikeRepository.TargetCount.class, "b");
        when(b.getTargetId()).thenReturn("fiefs");
        when(b.getCount()).thenReturn(2L);
        when(likeRepository.countsByTargetType("plugin")).thenReturn(List.of(a, b));

        Map<String, Long> counts = likeService.countsForType("plugin");

        assertThat(counts).containsEntry("mf", 5L).containsEntry("fiefs", 2L);
    }

    @Test
    void countsForType_invalidType_throws() {
        assertThatThrownBy(() -> likeService.countsForType("bogus"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void likedByUser_delegatesToRepository() {
        Like like = new Like(user, "plugin", "mf");
        when(likeRepository.findByUser(user)).thenReturn(List.of(like));

        assertThat(likeService.likedByUser(user)).containsExactly(like);
    }

    private static <T> T mock(Class<T> type, String name) {
        return org.mockito.Mockito.mock(type, name);
    }
}
