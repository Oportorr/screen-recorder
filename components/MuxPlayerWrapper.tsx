'use client';

import MuxPlayer from '@mux/mux-player-react';

interface MuxPlayerWrapperProps {
    playbackId: string;
    token?: string;
    title?: string;
}

export default function MuxPlayerWrapper({ playbackId, token, title }: MuxPlayerWrapperProps) {
    return (
        <MuxPlayer
        playbackId={playbackId}
        tokens={token ? {
            playback: token,
            thumbnail: token,
            storyboard: token,
        } : undefined}
        metadata={{
            video_title: title || 'Screen Recording',
        }}
        streamType="on-demand"
        autoPlay={false}
        accentColor="#3b82f6"
        />
    );
}