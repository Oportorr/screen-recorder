'use server';

import Mux from '@mux/mux-node';

const mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function createUploadUrl() {
    const upload = await mux.video.uploads.create({
        new_asset_settings: {
            playback_policy: ['public'],
            video_quality: 'plus',
            mp4_support: 'standard',
            input: [
                {
                    generated_subtitles: [
                        { language_code: 'en', name: 'English (Auto)' }
                    ]
                }
            ]
        },
        cors_origin: '*',
    });

    return upload;
}

export async function getAssetIdFromUpload(uploadId: string) {
    const upload = await mux.video.uploads.retrieve(uploadId);

    if (upload.asset_id) {
        const asset = await mux.video.assets.retrieve(upload.asset_id);
        return { 
            playbackId: asset.playback_ids?.[0]?.id,
            status: asset.status 
        };
    }

    return { status: 'waiting' };
}

export async function listVideos() {
    try {
        const assets = await mux.video.assets.list({ 
            limit: 25,
        });
        return assets.data;
    } catch (e) {
        console.error("Error listing videos", e);
        return [];
    }
}

function formatVttTime(timestamp: string) {
    return timestamp.split('.')[0]; 
}

export async function getAssetStatus(playbackId: string) {
    try {
        const assets = await mux.video.assets.list({ limit: 100 });
        const asset = assets.data.find(a => 
            a.playback_ids?.some(p => p.id === playbackId)
        );

        if (!asset) return { status: 'errored', transcript: [] };

        let transcript: { time: string; text: string }[] = [];
        let transcriptStatus = 'preparing'; 

        if (asset.status === 'ready' && asset.tracks) {
            const textTrack = asset.tracks.find(
                t => t.type === 'text' && t.text_type === 'subtitles'
            );

            if (textTrack && textTrack.status === 'ready') {
                transcriptStatus = 'ready';

                const vttUrl = `https://stream.mux.com/${playbackId}/text/${textTrack.id}.vtt`;
                const response = await fetch(vttUrl);
                const vttText = await response.text();

                const blocks = vttText.split('\n\n');

                transcript = blocks.reduce((acc: { time: string; text: string }[], block) => {
                    const lines = block.split('\n');
                    if (lines.length >= 2 && lines[1].includes('-->')) {
                        const time = formatVttTime(lines[1].split(' --> ')[0]);
                        const text = lines.slice(2).join(' '); 
                        if (text.trim()) acc.push({ time, text });
                    }
                    return acc;
                }, []);
            } 
        }

        return { 
            status: asset.status, 
            transcriptStatus, 
            transcript 
        };
    } catch (e) {
        return { status: 'errored', transcriptStatus: 'errored', transcript: [] };
    }
}

export async function generateVideoSummary(playbackId: string) {
  try {
    // First, find the asset ID from the playback ID
    const assets = await mux.video.assets.list({ limit: 100 });
    const asset = assets.data.find(a => 
      a.playback_ids?.some(p => p.id === playbackId)
    );

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Import dynamically to avoid issues with module resolution
    const { getSummaryAndTags } = await import('@mux/ai/workflows');

    // Generate summary using Mux AI
    // This uses the auto-generated transcript under the hood
    const result = await getSummaryAndTags(asset.id, {
      tone: 'professional', // Options: 'professional', 'playful', 'neutral'
    });

    return {
      title: result.title,
      summary: result.description,
      tags: result.tags,
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    return null;
  }
}