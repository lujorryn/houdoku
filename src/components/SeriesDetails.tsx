import fs from 'fs';
import path from 'path';
import React, { useEffect } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { Typography, Button, Descriptions, Affix, Modal } from 'antd';
import { ipcRenderer } from 'electron';
import {
  ReloadOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import Paragraph from 'antd/lib/typography/Paragraph';
import { connect, ConnectedProps } from 'react-redux';
import ChapterTable from './ChapterTable';
import {
  Chapter,
  ContentWarning,
  Format,
  Genre,
  Series,
  SeriesStatus,
  Theme,
} from '../models/types';
import { Languages } from '../models/languages';
import styles from './SeriesDetails.css';
import blankCover from '../img/blank_cover.png';
import routes from '../constants/routes.json';
import db from '../services/db';
import { getBannerImageUrl } from '../services/mediasource';
import {
  setChapterList,
  setSeries,
  setSeriesBannerUrl,
} from '../features/library/actions';
import {
  loadChapterList,
  loadSeries,
  loadSeriesList,
  reloadSeriesList,
  removeSeries,
  toggleChapterRead,
} from '../features/library/utils';
import { setStatusText } from '../features/statusbar/actions';
import { RootState } from '../store';

const { Title } = Typography;
const { confirm } = Modal;

const thumbnailsDir = await ipcRenderer.invoke('get-thumbnails-dir');
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir);
}

const mapState = (state: RootState) => ({
  series: state.library.series,
  chapterList: state.library.chapterList,
  seriesBannerUrl: state.library.seriesBannerUrl,
  chapterLanguages: state.settings.chapterLanguages,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapDispatch = (dispatch: any) => ({
  setSeries: (series: Series) => dispatch(setSeries(series)),
  setChapterList: (chapterList: Chapter[]) =>
    dispatch(setChapterList(chapterList)),
  setStatusText: (text?: string) => dispatch(setStatusText(text)),
  loadSeries: (id: number) => loadSeries(dispatch, id),
  loadSeriesList: () => loadSeriesList(dispatch),
  loadChapterList: (seriesId: number) => loadChapterList(dispatch, seriesId),
  removeSeries: (series: Series) => removeSeries(dispatch, series),
  toggleChapterRead: (chapter: Chapter, series: Series) =>
    toggleChapterRead(dispatch, chapter, series),
  setSeriesBannerUrl: (seriesBannerUrl: string | null) =>
    dispatch(setSeriesBannerUrl(seriesBannerUrl)),
});

const connector = connect(mapState, mapDispatch);
type PropsFromRedux = ConnectedProps<typeof connector>;

// eslint-disable-next-line @typescript-eslint/ban-types
type Props = PropsFromRedux & {};

const SeriesDetails: React.FC<Props> = (props: Props) => {
  const { id } = useParams();
  const history = useHistory();

  const loadContent = async () => {
    // eslint-disable-next-line promise/catch-or-return
    db.fetchSeries(id)
      .then((response: any) => {
        props.setSeries(response[0]);
        return getBannerImageUrl(response[0]);
      })
      .then((seriesBannerUrl: string) =>
        props.setSeriesBannerUrl(seriesBannerUrl)
      );

    props.loadChapterList(id);
  };

  useEffect(() => {
    loadContent();
  }, []);

  if (props.series === undefined) {
    return (
      <div>
        <p>Loading...</p>
      </div>
    );
  }

  const getThumbnailPath = (seriesId?: number) => {
    const thumbnailPath = path.join(thumbnailsDir, `${seriesId}.jpg`);
    return fs.existsSync(thumbnailPath) ? thumbnailPath : blankCover;
  };

  const handleRemove = () => {
    confirm({
      title: 'Remove this series from your library?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action is irreversible.',
      onOk() {
        if (props.series !== undefined) {
          props.removeSeries(props.series);
          history.push(routes.LIBRARY);
        }
      },
    });
  };

  const renderSeriesDescriptions = (series: Series) => {
    return (
      <Descriptions column={4}>
        <Descriptions.Item className={styles.descriptionItem} label="Author">
          {series.authors.join(';')}
        </Descriptions.Item>
        <Descriptions.Item className={styles.descriptionItem} label="Artist">
          {series.artists.join(';')}
        </Descriptions.Item>
        <Descriptions.Item className={styles.descriptionItem} label="Status">
          {SeriesStatus[series.status].toLowerCase()}
        </Descriptions.Item>
        <Descriptions.Item className={styles.descriptionItem} label="Language">
          {Languages[series.originalLanguageKey].name}
        </Descriptions.Item>
        <Descriptions.Item
          className={styles.descriptionItem}
          label="Genres"
          span={2}
        >
          {series.genres
            .map((genre: Genre) => Genre[genre].toLowerCase())
            .join('; ')}
        </Descriptions.Item>
        <Descriptions.Item
          className={styles.descriptionItem}
          label="Themes"
          span={2}
        >
          {series.themes
            .map((theme: Theme) => Theme[theme].toLowerCase())
            .join('; ')}
        </Descriptions.Item>
        <Descriptions.Item
          className={styles.descriptionItem}
          label="Formats"
          span={2}
        >
          {series.formats
            .map((format: Format) => Format[format].toLowerCase())
            .join('; ')}
        </Descriptions.Item>
        <Descriptions.Item
          className={styles.descriptionItem}
          label="Content Warnings"
          span={2}
        >
          {series.contentWarnings
            .map((contentWarning: ContentWarning) =>
              ContentWarning[contentWarning].toLowerCase()
            )
            .join('; ')}
        </Descriptions.Item>
      </Descriptions>
    );
  };

  return (
    <div>
      <Link to={routes.LIBRARY}>
        <Affix className={styles.backButtonAffix}>
          <Button onClick={() => props.loadSeriesList()}>
            ◀ Back to library
          </Button>
        </Affix>
      </Link>
      <Affix className={styles.controlButtonAffix}>
        <>
          <Button className={styles.removeButton} onClick={handleRemove}>
            Remove Series
          </Button>
          <Button
            className={styles.refreshButton}
            icon={<ReloadOutlined />}
            onClick={() => {
              if (props.series !== undefined)
                reloadSeriesList(
                  [props.series],
                  props.setStatusText,
                  loadContent
                );
            }}
          >
            Refresh
          </Button>
        </>
      </Affix>
      <div className={styles.backgroundContainer}>
        {props.seriesBannerUrl === null ? (
          <></>
        ) : (
          <img src={props.seriesBannerUrl} alt={props.series.title} />
        )}
      </div>
      <div className={styles.headerContainer}>
        <div>
          <img
            className={styles.coverImage}
            src={getThumbnailPath(props.series.id)}
            alt={props.series.title}
          />
        </div>
        <div className={styles.headerDetailsContainer}>
          <Title level={4}>{props.series.title}</Title>
          <Paragraph ellipsis={{ rows: 5, expandable: true, symbol: 'more' }}>
            {props.series.description}
          </Paragraph>
        </div>
      </div>
      {props.series !== undefined ? renderSeriesDescriptions(props.series) : ''}
      <ChapterTable
        chapterList={props.chapterList}
        series={props.series}
        defaultChapterLanguages={props.chapterLanguages}
        toggleChapterRead={props.toggleChapterRead}
      />
    </div>
  );
};

export default connector(SeriesDetails);
